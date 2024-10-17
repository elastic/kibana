/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { RuleToImport } from '../../../../../../common/api/detection_engine';
import type { ImportRuleResponse } from '../../../routes/utils';
import { createBulkErrorObject } from '../../../routes/utils';
import { checkRuleExceptionReferences } from './check_rule_exception_references';
import type { IDetectionRulesClient } from '../detection_rules_client/detection_rules_client_interface';
import { getReferencedExceptionLists } from './gather_referenced_exceptions';
import { isRuleConflictError, isRuleImportError } from './errors';

/**
 * Takes rules to be imported and either creates or updates rules
 * based on user overwrite preferences.
 *
 * @deprecated Use {@link importRules} instead.
 * @param ruleChunks {@link RuleToImport} - rules being imported
 * @param overwriteRules {boolean} - whether to overwrite existing rules
 * with imported rules if their rule_id matches
 * @param detectionRulesClient {object}
 * @returns {Promise} an array of error and success messages from import
 */
export const importRulesLegacy = async ({
  ruleChunks,
  overwriteRules,
  detectionRulesClient,
  allowMissingConnectorSecrets,
  savedObjectsClient,
}: {
  ruleChunks: RuleToImport[][];
  overwriteRules: boolean;
  detectionRulesClient: IDetectionRulesClient;
  allowMissingConnectorSecrets?: boolean;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<ImportRuleResponse[]> => {
  const response: ImportRuleResponse[] = [];

  if (ruleChunks.length === 0) {
    return response;
  }

  while (ruleChunks.length) {
    const batchParseObjects = ruleChunks.shift() ?? [];
    const existingLists = await getReferencedExceptionLists({
      rules: batchParseObjects,
      savedObjectsClient,
    });
    const newImportRuleResponse = await Promise.all(
      batchParseObjects.reduce<Array<Promise<ImportRuleResponse>>>((accum, parsedRule) => {
        const importsWorkerPromise = new Promise<ImportRuleResponse>(async (resolve, reject) => {
          try {
            if (parsedRule.immutable) {
              resolve(
                createBulkErrorObject({
                  statusCode: 400,
                  message: i18n.translate(
                    'xpack.securitySolution.detectionEngine.rules.importPrebuiltRulesUnsupported',
                    {
                      defaultMessage:
                        'Importing prebuilt rules is not supported. To import this rule as a custom rule, first duplicate the rule and then export it. [rule_id: {ruleId}]',
                      values: { ruleId: parsedRule.rule_id },
                    }
                  ),
                  ruleId: parsedRule.rule_id,
                })
              );

              return null;
            }

            try {
              const [exceptionErrors, exceptions] = checkRuleExceptionReferences({
                rule: parsedRule,
                existingLists,
              });

              const exceptionBulkErrors = exceptionErrors.map((error) =>
                createBulkErrorObject({
                  ruleId: error.error.ruleId,
                  statusCode: 400,
                  message: error.error.message,
                })
              );

              response.push(...exceptionBulkErrors);

              const importedRule = await detectionRulesClient.importRule({
                ruleToImport: {
                  ...parsedRule,
                  exceptions_list: [...exceptions],
                },
                overwriteRules,
                allowMissingConnectorSecrets,
              });

              resolve({
                rule_id: importedRule.rule_id,
                status_code: 200,
              });
            } catch (err) {
              const { error, statusCode, message } = err;
              if (isRuleImportError(err)) {
                resolve(
                  createBulkErrorObject({
                    message: err.error.message,
                    statusCode: isRuleConflictError(err) ? 409 : 400,
                    ruleId: err.error.ruleId,
                  })
                );
                return null;
              }

              resolve(
                createBulkErrorObject({
                  ruleId: parsedRule.rule_id,
                  statusCode: statusCode ?? error?.status_code ?? 400,
                  message: message ?? error?.message ?? 'unknown error',
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
    response.push(...newImportRuleResponse);
  }

  return response;
};
