/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  ImportExceptionsListSchema,
  ImportExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { type RuleToImport } from '../../../../../../common/api/detection_engine/rule_management';
import { type ImportRuleResponse, createBulkErrorObject } from '../../../routes/utils';
import type { PrebuiltRulesImportHelper } from '../../../prebuilt_rules/logic/prebuilt_rules_import_helper';
import type { IDetectionRulesClient } from '../detection_rules_client/detection_rules_client_interface';
import { isRuleConflictError, isRuleImportError } from './errors';

export type PromiseFromStreams = RuleToImport | Error;
export interface RuleExceptionsPromiseFromStreams {
  rules: PromiseFromStreams[];
  exceptions: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema>;
  actionConnectors: SavedObject[];
}

const ruleIsError = (rule: RuleToImport | Error): rule is Error => rule instanceof Error;

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
  prebuiltRulesImportHelper,
  allowMissingConnectorSecrets,
  savedObjectsClient,
}: {
  ruleChunks: PromiseFromStreams[][];
  rulesResponseAcc: ImportRuleResponse[];
  overwriteRules: boolean;
  detectionRulesClient: IDetectionRulesClient;
  prebuiltRulesImportHelper: PrebuiltRulesImportHelper;
  allowMissingConnectorSecrets?: boolean;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  let response: ImportRuleResponse[] = [...rulesResponseAcc];

  // If we had 100% errors and no successful rule could be imported we still have to output an error.
  // otherwise we would output we are success importing 0 rules.
  if (ruleChunks.length === 0) {
    return response;
  }

  await prebuiltRulesImportHelper.setup();

  while (ruleChunks.length) {
    const ruleChunk = ruleChunks.shift() ?? [];
    const [errors, rules] = partition(ruleChunk, ruleIsError);

    const importedRulesResponse = await detectionRulesClient.importRules({
      allowMissingConnectorSecrets,
      detectionRulesClient,
      overwriteRules,
      prebuiltRulesImportHelper,
      rules,
      savedObjectsClient,
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
