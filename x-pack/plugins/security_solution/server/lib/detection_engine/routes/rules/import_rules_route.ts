/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import { extname } from 'path';
import { schema } from '@kbn/config-schema';
import { createPromiseFromStreams } from '@kbn/utils';

import { transformError, getIndexExists } from '@kbn/securitysolution-es-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import {
  importRulesQuerySchema,
  ImportRulesQuerySchemaDecoded,
  ImportRulesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/import_rules_schema';
import {
  ImportRulesSchema as ImportRulesResponseSchema,
  importRulesSchema as importRulesResponseSchema,
} from '../../../../../common/detection_engine/schemas/response/import_rules_schema';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { ConfigType } from '../../../../config';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { createRules } from '../../rules/create_rules';
import { readRules } from '../../rules/read_rules';
import {
  createBulkErrorObject,
  ImportRuleResponse,
  BulkError,
  isBulkError,
  isImportRegular,
  buildSiemResponse,
} from '../utils';

import { patchRules } from '../../rules/patch_rules';
import { legacyMigrate } from '../../rules/utils';
import { getTupleDuplicateErrorsAndUniqueRules, getInvalidConnectors } from './utils';
import { createRulesStreamFromNdJson } from '../../rules/create_rules_stream_from_ndjson';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { HapiReadableStream } from '../../rules/types';
import { PartialFilter } from '../../types';

type PromiseFromStreams = ImportRulesSchemaDecoded | Error;
import {
  importRules as importRulesHelper,
  RuleExceptionsPromiseFromStreams,
} from './utils/import_rules_utils';
import { getReferencedExceptionLists } from './utils/gather_referenced_exceptions';
import { importRuleExceptions } from './utils/import_rule_exceptions';
import { ImportRulesSchemaDecoded } from '../../../../../common/detection_engine/schemas/request';

const CHUNK_PARSED_OBJECT_SIZE = 50;

export const importRulesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml'],
  isRuleRegistryEnabled: boolean
) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_import`,
      validate: {
        query: buildRouteValidation<typeof importRulesQuerySchema, ImportRulesQuerySchemaDecoded>(
          importRulesQuerySchema
        ),
        body: schema.any(), // validation on file object is accomplished later in the handler.
      },
      options: {
        tags: ['access:securitySolution'],
        body: {
          maxBytes: config.maxRuleImportPayloadBytes,
          output: 'stream',
        },
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const rulesClient = context.alerting.getRulesClient();
        const actionsClient = context.actions.getActionsClient();
        const esClient = context.core.elasticsearch.client;
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution.getAppClient();

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });

        const ruleStatusClient = context.securitySolution.getExecutionLogClient();
        const { filename } = (request.body.file as HapiReadableStream).hapi;
        const fileExtension = extname(filename).toLowerCase();
        if (fileExtension !== '.ndjson') {
          return siemResponse.error({
            statusCode: 400,
            body: `Invalid file extension ${fileExtension}`,
          });
        }

        const signalsIndex = siemClient.getSignalsIndex();
        const indexExists = await getIndexExists(esClient.asCurrentUser, signalsIndex);
        if (!isRuleRegistryEnabled && !indexExists) {
          return siemResponse.error({
            statusCode: 400,
            body: `To create a rule, the index must exist first. Index ${signalsIndex} does not exist`,
          });
        }

        const objectLimit = config.maxRuleImportExportSize;
        const readStream = createRulesStreamFromNdJson(objectLimit);
        const parsedObjects = await createPromiseFromStreams<PromiseFromStreams[]>([
          request.body.file as HapiReadableStream,
          ...readStream,
        ]);

        const [duplicateIdErrors, parsedObjectsWithoutDuplicateErrors] =
          getTupleDuplicateErrorsAndUniqueRules(parsedObjects, request.query.overwrite);

        let parsedRules;
        let actionErrors: BulkError[] = [];
        const actualRules = parsedObjects.filter(
          (rule): rule is ImportRulesSchemaDecoded => !(rule instanceof Error)
        );
        
        if (actualRules.some((rule) => rule.actions.length > 0)) {
          const [nonExistentActionErrors, uniqueParsedObjects] = await getInvalidConnectors(
            parsedObjectsWithoutDuplicateErrors,
            actionsClient
          );
          parsedRules = uniqueParsedObjects;
          actionErrors = nonExistentActionErrors;
        } else {
          parsedRules = parsedObjectsWithoutDuplicateErrors;
        }
        const chunkParseObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, parsedRules);
        let importRuleResponse: ImportRuleResponse[] = [];

        // If we had 100% errors and no successful rule could be imported we still have to output an error.
        // otherwise we would output we are success importing 0 rules.
        if (chunkParseObjects.length === 0) {
          importRuleResponse = [...actionErrors, ...duplicateIdErrors];
        }

        while (chunkParseObjects.length) {
          const batchParseObjects = chunkParseObjects.shift() ?? [];
          const newImportRuleResponse = await Promise.all(
            batchParseObjects.reduce<Array<Promise<ImportRuleResponse>>>((accum, parsedRule) => {
              const importsWorkerPromise = new Promise<ImportRuleResponse>(
                async (resolve, reject) => {
                  try {
                    if (parsedRule instanceof Error) {
                      // If the JSON object had a validation or parse error then we return
                      // early with the error and an (unknown) for the ruleId
                      resolve(
                        createBulkErrorObject({
                          statusCode: 400,
                          message: parsedRule.message,
                        })
                      );
                      return null;
                    }

                    const {
                      anomaly_threshold: anomalyThreshold,
                      author,
                      building_block_type: buildingBlockType,
                      description,
                      enabled,
                      event_category_override: eventCategoryOverride,
                      false_positives: falsePositives,
                      from,
                      immutable,
                      query: queryOrUndefined,
                      language: languageOrUndefined,
                      license,
                      machine_learning_job_id: machineLearningJobId,
                      output_index: outputIndex,
                      saved_id: savedId,
                      meta,
                      filters: filtersRest,
                      rule_id: ruleId,
                      index,
                      interval,
                      max_signals: maxSignals,
                      risk_score: riskScore,
                      risk_score_mapping: riskScoreMapping,
                      rule_name_override: ruleNameOverride,
                      name,
                      severity,
                      severity_mapping: severityMapping,
                      tags,
                      threat,
                      threat_filters: threatFilters,
                      threat_index: threatIndex,
                      threat_query: threatQuery,
                      threat_mapping: threatMapping,
                      threat_language: threatLanguage,
                      threat_indicator_path: threatIndicatorPath,
                      concurrent_searches: concurrentSearches,
                      items_per_search: itemsPerSearch,
                      threshold,
                      timestamp_override: timestampOverride,
                      to,
                      type,
                      references,
                      note,
                      timeline_id: timelineId,
                      timeline_title: timelineTitle,
                      throttle,
                      version,
                      exceptions_list: exceptionsList,
                      actions,
                    } = parsedRule;

                    try {
                      const query =
                        !isMlRule(type) && queryOrUndefined == null ? '' : queryOrUndefined;
                      const language =
                        !isMlRule(type) && languageOrUndefined == null
                          ? 'kuery'
                          : languageOrUndefined; // TODO: Fix these either with an is conversion or by better typing them within io-ts

                      const filters: PartialFilter[] | undefined = filtersRest as PartialFilter[];
                      throwHttpError(await mlAuthz.validateRuleType(type));
                      const rule = await readRules({
                        isRuleRegistryEnabled,
                        rulesClient,
                        ruleId,
                        id: undefined,
                      });

                      if (rule == null) {
                        await createRules({
                          isRuleRegistryEnabled,
                          rulesClient,
                          anomalyThreshold,
                          author,
                          buildingBlockType,
                          description,
                          enabled,
                          eventCategoryOverride,
                          falsePositives,
                          from,
                          immutable,
                          query,
                          language,
                          license,
                          machineLearningJobId,
                          outputIndex: signalsIndex,
                          savedId,
                          timelineId,
                          timelineTitle,
                          meta,
                          filters,
                          ruleId,
                          index,
                          interval,
                          maxSignals,
                          name,
                          riskScore,
                          riskScoreMapping,
                          ruleNameOverride,
                          severity,
                          severityMapping,
                          tags,
                          throttle,
                          to,
                          type,
                          threat,
                          threshold,
                          threatFilters,
                          threatIndex,
                          threatIndicatorPath,
                          threatQuery,
                          threatMapping,
                          threatLanguage,
                          concurrentSearches,
                          itemsPerSearch,
                          timestampOverride,
                          references,
                          note,
                          version,
                          exceptionsList,
                          actions,
                        });
                        resolve({
                          rule_id: ruleId,
                          status_code: 200,
                        });
                      } else if (rule != null && request.query.overwrite) {
                        const migratedRule = await legacyMigrate({
                          rulesClient,
                          savedObjectsClient,
                          rule,
                        });
                        await patchRules({
                          rulesClient,
                          savedObjectsClient,
                          author,
                          buildingBlockType,
                          spaceId: context.securitySolution.getSpaceId(),
                          ruleStatusClient,
                          description,
                          enabled,
                          eventCategoryOverride,
                          falsePositives,
                          from,
                          query,
                          language,
                          license,
                          outputIndex,
                          savedId,
                          timelineId,
                          timelineTitle,
                          meta,
                          filters,
                          rule: migratedRule,
                          index,
                          interval,
                          maxSignals,
                          riskScore,
                          riskScoreMapping,
                          ruleNameOverride,
                          name,
                          severity,
                          severityMapping,
                          tags,
                          timestampOverride,
                          throttle,
                          to,
                          type,
                          threat,
                          threshold,
                          threatFilters,
                          threatIndex,
                          threatQuery,
                          threatMapping,
                          threatLanguage,
                          concurrentSearches,
                          itemsPerSearch,
                          references,
                          note,
                          version,
                          exceptionsList,
                          anomalyThreshold,
                          machineLearningJobId,
                          actions,
                        });
                        resolve({
                          rule_id: ruleId,
                          status_code: 200,
                        });
                      } else if (rule != null) {
                        resolve(
                          createBulkErrorObject({
                            ruleId,
                            statusCode: 409,
                            message: `rule_id: "${ruleId}" already exists`,
                          })
                        );
                      }
                    } catch (err) {
                      resolve(
                        createBulkErrorObject({
                          ruleId,
                          statusCode: err.statusCode ?? 400,
                          message: err.message,
                        })
                      );
                    }
                  } catch (error) {
                    reject(error);
                  }
                }
              );
              return [...accum, importsWorkerPromise];
            }, [])
          );
          importRuleResponse = [
            ...actionErrors,
            ...duplicateIdErrors,
            ...importRuleResponse,
            ...newImportRuleResponse,
          ];
        }

        const errorsResp = importRuleResponse.filter((resp) => isBulkError(resp)) as BulkError[];
        const successes = importRuleResponse.filter((resp) => {
          if (isImportRegular(resp)) {
            return resp.status_code === 200;
          } else {
            return false;
          }
        });
        const importRules: ImportRulesResponseSchema = {
          success: errorsResp.length === 0,
          success_count: successes.length,
          errors: errorsResp,
        };
        const [validated, errors] = validate(importRules, importRulesResponseSchema);
        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
        }
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
