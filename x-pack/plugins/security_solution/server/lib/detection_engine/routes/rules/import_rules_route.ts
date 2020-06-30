/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chunk } from 'lodash/fp';
import { extname } from 'path';

import { validate } from '../../../../../common/validate';
import {
  importRulesQuerySchema,
  ImportRulesQuerySchemaDecoded,
  importRulesPayloadSchema,
  ImportRulesPayloadSchemaDecoded,
  ImportRulesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/import_rules_schema';
import {
  ImportRulesSchema as ImportRulesResponseSchema,
  importRulesSchema as importRulesResponseSchema,
} from '../../../../../common/detection_engine/schemas/response/import_rules_schema';
import { IRouter } from '../../../../../../../../src/core/server';
import { createPromiseFromStreams } from '../../../../../../../../src/legacy/utils/streams';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { ConfigType } from '../../../../config';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { createRules } from '../../rules/create_rules';
import { readRules } from '../../rules/read_rules';
import { getIndexExists } from '../../index/get_index_exists';
import {
  createBulkErrorObject,
  ImportRuleResponse,
  BulkError,
  isBulkError,
  isImportRegular,
  transformError,
  buildSiemResponse,
} from '../utils';
import { patchRules } from '../../rules/patch_rules';
import { getTupleDuplicateErrorsAndUniqueRules } from './utils';
import { createRulesStreamFromNdJson } from '../../rules/create_rules_stream_from_ndjson';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { HapiReadableStream } from '../../rules/types';
import { PartialFilter } from '../../types';

type PromiseFromStreams = ImportRulesSchemaDecoded | Error;

const CHUNK_PARSED_OBJECT_SIZE = 10;

export const importRulesRoute = (router: IRouter, config: ConfigType, ml: SetupPlugins['ml']) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_import`,
      validate: {
        query: buildRouteValidation<typeof importRulesQuerySchema, ImportRulesQuerySchemaDecoded>(
          importRulesQuerySchema
        ),
        body: buildRouteValidation<
          typeof importRulesPayloadSchema,
          ImportRulesPayloadSchemaDecoded
        >(importRulesPayloadSchema),
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
        const alertsClient = context.alerting?.getAlertsClient();
        const clusterClient = context.core.elasticsearch.legacy.client;
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution?.getAppClient();

        if (!siemClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const mlAuthz = buildMlAuthz({ license: context.licensing.license, ml, request });

        const { filename } = (request.body.file as HapiReadableStream).hapi;
        const fileExtension = extname(filename).toLowerCase();
        if (fileExtension !== '.ndjson') {
          return siemResponse.error({
            statusCode: 400,
            body: `Invalid file extension ${fileExtension}`,
          });
        }
        const signalsIndex = siemClient.getSignalsIndex();
        const indexExists = await getIndexExists(clusterClient.callAsCurrentUser, signalsIndex);
        if (!indexExists) {
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
        const [duplicateIdErrors, uniqueParsedObjects] = getTupleDuplicateErrorsAndUniqueRules(
          parsedObjects,
          request.query.overwrite
        );

        const chunkParseObjects = chunk(CHUNK_PARSED_OBJECT_SIZE, uniqueParsedObjects);
        let importRuleResponse: ImportRuleResponse[] = [];

        while (chunkParseObjects.length) {
          const batchParseObjects = chunkParseObjects.shift() ?? [];
          const newImportRuleResponse = await Promise.all(
            batchParseObjects.reduce<Array<Promise<ImportRuleResponse>>>((accum, parsedRule) => {
              const importsWorkerPromise = new Promise<ImportRuleResponse>(async (resolve) => {
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
                  timestamp_override: timestampOverride,
                  to,
                  type,
                  references,
                  note,
                  timeline_id: timelineId,
                  timeline_title: timelineTitle,
                  version,
                  exceptions_list: exceptionsList,
                } = parsedRule;

                try {
                  const query =
                    type !== 'machine_learning' && queryOrUndefined == null ? '' : queryOrUndefined;

                  const language =
                    type !== 'machine_learning' && languageOrUndefined == null
                      ? 'kuery'
                      : languageOrUndefined;

                  // TODO: Fix these either with an is conversion or by better typing them within io-ts
                  const filters: PartialFilter[] | undefined = filtersRest as PartialFilter[];

                  throwHttpError(await mlAuthz.validateRuleType(type));

                  const rule = await readRules({ alertsClient, ruleId, id: undefined });
                  if (rule == null) {
                    await createRules({
                      alertsClient,
                      anomalyThreshold,
                      author,
                      buildingBlockType,
                      description,
                      enabled,
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
                      to,
                      type,
                      threat,
                      timestampOverride,
                      references,
                      note,
                      version,
                      exceptionsList,
                      actions: [], // Actions are not imported nor exported at this time
                    });
                    resolve({ rule_id: ruleId, status_code: 200 });
                  } else if (rule != null && request.query.overwrite) {
                    await patchRules({
                      alertsClient,
                      author,
                      buildingBlockType,
                      savedObjectsClient,
                      description,
                      enabled,
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
                      rule,
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
                      to,
                      type,
                      threat,
                      references,
                      note,
                      version,
                      exceptionsList,
                      anomalyThreshold,
                      machineLearningJobId,
                      actions: undefined,
                    });
                    resolve({ rule_id: ruleId, status_code: 200 });
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
              });
              return [...accum, importsWorkerPromise];
            }, [])
          );
          importRuleResponse = [
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
