/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import {
  ImportExceptionsListSchema,
  ImportExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { legacyMigrate } from '../../../rules/utils';
import { PartialFilter } from '../../../types';
import { createBulkErrorObject, ImportRuleResponse } from '../../utils';
import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { createRules } from '../../../rules/create_rules';
import { readRules } from '../../../rules/read_rules';
import { patchRules } from '../../../rules/patch_rules';
import { ImportRulesSchemaDecoded } from '../../../../../../common/detection_engine/schemas/request/import_rules_schema';
import { MlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { RulesClient } from '../../../../../../../../plugins/alerting/server';
import { ExceptionListClient } from '../../../../../../../../plugins/lists/server';
import { checkRuleExceptionReferences } from './check_rule_exception_references';

export type PromiseFromStreams = ImportRulesSchemaDecoded | Error;
export interface RuleExceptionsPromiseFromStreams {
  rules: PromiseFromStreams[];
  exceptions: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema>;
}

/**
 * Takes rules to be imported and either creates or updates rules
 * based on user overwrite preferences
 * @param ruleChunks {array} - rules being imported
 * @param rulesResponseAcc {array} - the accumulation of success and
 * error messages gathered through the rules import logic
 * @param mlAuthz {object}
 * @param overwriteRules {boolean} - whether to overwrite existing rules
 * with imported rules if their rule_id matches
 * @param isRuleRegistryEnabled {boolean} - feature flag that should be
 * removed as this is now on and no going back
 * @param rulesClient {object}
 * @param savedObjectsClient {object}
 * @param exceptionsClient {object}
 * @param spaceId {string} - space being used during import
 * @param signalsIndex {string} - the signals index name
 * @param existingLists {object} - all exception lists referenced by
 * rules that were found to exist
 * @returns {Promise} an array of error and success messages from import
 */
export const importRules = async ({
  ruleChunks,
  rulesResponseAcc,
  mlAuthz,
  overwriteRules,
  isRuleRegistryEnabled,
  rulesClient,
  savedObjectsClient,
  exceptionsClient,
  spaceId,
  signalsIndex,
  existingLists,
}: {
  ruleChunks: PromiseFromStreams[][];
  rulesResponseAcc: ImportRuleResponse[];
  mlAuthz: MlAuthz;
  overwriteRules: boolean;
  isRuleRegistryEnabled: boolean;
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  exceptionsClient: ExceptionListClient | undefined;
  spaceId: string;
  signalsIndex: string;
  existingLists: Record<string, ExceptionListSchema>;
}) => {
  let importRuleResponse: ImportRuleResponse[] = [...rulesResponseAcc];

  // If we had 100% errors and no successful rule could be imported we still have to output an error.
  // otherwise we would output we are success importing 0 rules.
  if (ruleChunks.length === 0) {
    return importRuleResponse;
  } else {
    while (ruleChunks.length) {
      const batchParseObjects = ruleChunks.shift() ?? [];
      const newImportRuleResponse = await Promise.all(
        batchParseObjects.reduce<Array<Promise<ImportRuleResponse>>>((accum, parsedRule) => {
          const importsWorkerPromise = new Promise<ImportRuleResponse>(async (resolve, reject) => {
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
                actions,
              } = parsedRule;

              try {
                const [exceptionErrors, exceptions] = checkRuleExceptionReferences({
                  rule: parsedRule,
                  existingLists,
                });

                importRuleResponse = [...importRuleResponse, ...exceptionErrors];

                const query = !isMlRule(type) && queryOrUndefined == null ? '' : queryOrUndefined;
                const language =
                  !isMlRule(type) && languageOrUndefined == null ? 'kuery' : languageOrUndefined; // TODO: Fix these either with an is conversion or by better typing them within io-ts
                const filters: PartialFilter[] | undefined = filtersRest as PartialFilter[];
                throwAuthzError(await mlAuthz.validateRuleType(type));
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
                    exceptionsList: [...exceptions],
                    actions,
                  });
                  resolve({
                    rule_id: ruleId,
                    status_code: 200,
                  });
                } else if (rule != null && overwriteRules) {
                  const migratedRule = await legacyMigrate({
                    rulesClient,
                    savedObjectsClient,
                    rule,
                  });
                  await patchRules({
                    rulesClient,
                    author,
                    buildingBlockType,
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
                    threatIndicatorPath,
                    threatQuery,
                    threatMapping,
                    threatLanguage,
                    concurrentSearches,
                    itemsPerSearch,
                    references,
                    note,
                    version,
                    exceptionsList: [...exceptions],
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
          });
          return [...accum, importsWorkerPromise];
        }, [])
      );
      importRuleResponse = [...importRuleResponse, ...newImportRuleResponse];
    }

    return importRuleResponse;
  }
};
