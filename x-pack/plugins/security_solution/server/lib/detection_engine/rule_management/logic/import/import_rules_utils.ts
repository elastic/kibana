/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import type { SavedObject } from '@kbn/core/server';
import type {
  ImportExceptionsListSchema,
  ImportExceptionListItemSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { RuleToImport } from '../../../../../../common/api/detection_engine/rule_management';
import type { ImportRuleResponse } from '../../../routes/utils';
import { createBulkErrorObject } from '../../../routes/utils';
import { createRules } from '../crud/create_rules';
import { readRules } from '../crud/read_rules';
import { updateRules } from '../crud/update_rules';
import type { MlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { checkRuleExceptionReferences } from './check_rule_exception_references';

export type PromiseFromStreams = RuleToImport | Error;
export interface RuleExceptionsPromiseFromStreams {
  rules: PromiseFromStreams[];
  exceptions: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema>;
  actionConnectors: SavedObject[];
}

const IMPORT_RULES_CHUNK_SIZE = 50;

/**
 * Takes rules to be imported and either creates or updates rules
 * based on user overwrite preferences
 * @param rules {array} - rules being imported
 * @param rulesResponseAcc {array} - the accumulation of success and
 * error messages gathered through the rules import logic
 * @param mlAuthz {object}
 * @param overwriteRules {boolean} - whether to overwrite existing rules
 * with imported rules if their rule_id matches
 * @param rulesClient {object}
 * @param existingLists {object} - all exception lists referenced by
 * rules that were found to exist
 * @returns {Promise} an array of error and success messages from import
 */
export const importRules = async ({
  rules,
  rulesResponseAcc,
  mlAuthz,
  overwriteRules,
  rulesClient,
  existingLists,
  allowMissingConnectorSecrets,
}: {
  rules: PromiseFromStreams[];
  rulesResponseAcc: ImportRuleResponse[];
  mlAuthz: MlAuthz;
  overwriteRules: boolean;
  rulesClient: RulesClient;
  existingLists: Record<string, ExceptionListSchema>;
  allowMissingConnectorSecrets?: boolean;
}): Promise<ImportRuleResponse[]> => {
  // If we had 100% errors and no successful rule could be imported we still have to output an error.
  // otherwise we would output we are success importing 0 rules.
  if (rules.length === 0) {
    return [...rulesResponseAcc];
  }

  const importRuleResponses = [...rulesResponseAcc];
  const ruleChunks = chunk(IMPORT_RULES_CHUNK_SIZE, rules);
  const importRule = async (ruleToImport: PromiseFromStreams): Promise<ImportRuleResponse> => {
    if (ruleToImport instanceof Error) {
      // If the JSON object had a validation or parse error then we return
      // early with the error and an (unknown) for the ruleId
      return createBulkErrorObject({
        statusCode: 400,
        message: ruleToImport.message,
      });
    }

    try {
      const [exceptionErrors, exceptions] = checkRuleExceptionReferences({
        rule: ruleToImport,
        existingLists,
      });

      for (const exceptionError of exceptionErrors) {
        importRuleResponses.push(exceptionError);
      }

      throwAuthzError(await mlAuthz.validateRuleType(ruleToImport.type));
      const existingRule = await readRules({
        rulesClient,
        ruleId: ruleToImport.rule_id,
        id: undefined,
      });

      if (existingRule != null && !overwriteRules) {
        return createBulkErrorObject({
          ruleId: ruleToImport.rule_id,
          statusCode: 409,
          message: `rule_id: "${ruleToImport.rule_id}" already exists`,
        });
      }

      if (existingRule == null) {
        await createRules({
          rulesClient,
          params: {
            ...ruleToImport,
            exceptions_list: [...exceptions],
          },
          allowMissingConnectorSecrets,
        });

        return {
          rule_id: ruleToImport.rule_id,
          status_code: 200,
        };
      }

      await updateRules({
        rulesClient,
        existingRule,
        ruleUpdate: {
          ...ruleToImport,
          exceptions_list: [...exceptions],
        },
        allowMissingConnectorSecrets,
      });

      return {
        rule_id: ruleToImport.rule_id,
        status_code: 200,
      };
    } catch (err) {
      return createBulkErrorObject({
        ruleId: ruleToImport.rule_id,
        statusCode: err.statusCode ?? 400,
        message: err.message,
      });
    }
  };

  for (const rulesChunk of ruleChunks) {
    const chunkImportRuleResponses = await Promise.all(rulesChunk.map(importRule));

    for (const importRuleResponse of chunkImportRuleResponses) {
      importRuleResponses.push(importRuleResponse);
    }
  }

  return importRuleResponses;
};
