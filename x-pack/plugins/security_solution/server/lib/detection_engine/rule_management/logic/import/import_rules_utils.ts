/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type {
  ImportExceptionsListSchema,
  ImportExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
// eslint-disable-next-line no-restricted-imports
import { legacyMigrate } from '../rule_actions/legacy_action_migration';
import type { ImportRuleResponse } from '../../../routes/utils';
import { createBulkErrorObject } from '../../../routes/utils';
import { createRules } from '../crud/create_rules';
import { readRules } from '../crud/read_rules';
import { patchRules } from '../crud/patch_rules';
import type { ImportRulesSchema } from '../../../../../../common/detection_engine/schemas/request/import_rules_schema';
import type { MlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { checkRuleExceptionReferences } from './check_rule_exception_references';

export type PromiseFromStreams = ImportRulesSchema | Error;
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
 * @param rulesClient {object}
 * @param savedObjectsClient {object}
 * @param exceptionsClient {object}
 * @param spaceId {string} - space being used during import
 * @param existingLists {object} - all exception lists referenced by
 * rules that were found to exist
 * @returns {Promise} an array of error and success messages from import
 */
export const importRules = async ({
  ruleChunks,
  rulesResponseAcc,
  mlAuthz,
  overwriteRules,
  rulesClient,
  savedObjectsClient,
  exceptionsClient,
  spaceId,
  existingLists,
}: {
  ruleChunks: PromiseFromStreams[][];
  rulesResponseAcc: ImportRuleResponse[];
  mlAuthz: MlAuthz;
  overwriteRules: boolean;
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  exceptionsClient: ExceptionListClient | undefined;
  spaceId: string;
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

              try {
                const [exceptionErrors, exceptions] = checkRuleExceptionReferences({
                  rule: parsedRule,
                  existingLists,
                });

                importRuleResponse = [...importRuleResponse, ...exceptionErrors];

                throwAuthzError(await mlAuthz.validateRuleType(parsedRule.type));
                const rule = await readRules({
                  rulesClient,
                  ruleId: parsedRule.rule_id,
                  id: undefined,
                });

                if (rule == null) {
                  await createRules({
                    rulesClient,
                    params: {
                      ...parsedRule,
                      exceptions_list: [...exceptions],
                    },
                  });
                  resolve({
                    rule_id: parsedRule.rule_id,
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
                    existingRule: migratedRule,
                    nextParams: {
                      ...parsedRule,
                      exceptions_list: [...exceptions],
                    },
                  });
                  resolve({
                    rule_id: parsedRule.rule_id,
                    status_code: 200,
                  });
                } else if (rule != null) {
                  resolve(
                    createBulkErrorObject({
                      ruleId: parsedRule.rule_id,
                      statusCode: 409,
                      message: `rule_id: "${parsedRule.rule_id}" already exists`,
                    })
                  );
                }
              } catch (err) {
                resolve(
                  createBulkErrorObject({
                    ruleId: parsedRule.rule_id,
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
