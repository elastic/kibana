/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';

import { type ImportRuleResponse, createBulkErrorObject } from '../../../routes/utils';
import type { IRuleSourceImporter } from '../../../prebuilt_rules/logic/rule_source_importer';
import type { IDetectionRulesClient } from '../detection_rules_client/detection_rules_client_interface';
import { isRuleConflictError, isRuleImportError } from './errors';
import { isRuleToImport, type RuleFromImportStream } from './utils';

/**
 * Takes a stream of rules to be imported and either creates or updates rules
 * based on user overwrite preferences
 * @param ruleChunks {array} - rules being imported
 * @param rulesResponseAcc {array} - the accumulation of success and
 * error messages gathered through the rules import logic
 * @param mlAuthz {object}
 * @param overwriteRules {boolean} - whether to overwrite existing rules
 * with imported rules if their rule_id matches
 * @param detectionRulesClient {object}
 * @param existingLists {object} - all exception lists referenced by
 * rules that were found to exist
 * @returns {Promise} an array of error and success messages from import
 */
export const importRules = async ({
  ruleChunks,
  rulesResponseAcc,
  overwriteRules,
  detectionRulesClient,
  ruleSourceImporter,
  allowMissingConnectorSecrets,
}: {
  ruleChunks: RuleFromImportStream[][];
  rulesResponseAcc: ImportRuleResponse[];
  overwriteRules: boolean;
  detectionRulesClient: IDetectionRulesClient;
  ruleSourceImporter: IRuleSourceImporter;
  allowMissingConnectorSecrets?: boolean;
}) => {
  let response: ImportRuleResponse[] = [...rulesResponseAcc];

  // If we had 100% errors and no successful rule could be imported we still have to output an error.
  // otherwise we would output we are success importing 0 rules.
  if (ruleChunks.length === 0) {
    return response;
  }

  while (ruleChunks.length) {
    const ruleChunk = ruleChunks.shift() ?? [];
    const [rules, errors] = partition(ruleChunk, isRuleToImport);

    const importedRulesResponse = await detectionRulesClient.importRules({
      allowMissingConnectorSecrets,
      overwriteRules,
      ruleSourceImporter,
      rules,
    });

    const genericErrors = errors.map((error) =>
      createBulkErrorObject({
        statusCode: 400,
        message: error.message,
      })
    );

    const importResponses = importedRulesResponse.map((rule) => {
      if (isRuleImportError(rule)) {
        return createBulkErrorObject({
          message: rule.error.message,
          statusCode: isRuleConflictError(rule) ? 409 : 400,
          ruleId: rule.error.ruleId,
        });
      }

      return {
        rule_id: rule.rule_id,
        status_code: 200,
      };
    });

    response = [...response, ...genericErrors, ...importResponses];
  }

  return response;
};
