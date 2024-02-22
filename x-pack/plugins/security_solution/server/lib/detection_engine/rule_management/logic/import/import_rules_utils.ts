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
import type { MlAuthz } from '../../../../machine_learning/authz';
import { wrapInMacrotask } from '../../utils/wrap_in_macrotask';
import { importRulesChunk } from './import_rules_chunk';

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

  const result = [...rulesResponseAcc];
  const ruleChunks = chunk(IMPORT_RULES_CHUNK_SIZE, rules);

  for (const rulesChunk of ruleChunks) {
    const importRulesChunkInMacrotask = wrapInMacrotask(() =>
      importRulesChunk({
        rulesToImport: rulesChunk,
        mlAuthz,
        overwriteExistingRules: overwriteRules,
        rulesClient,
        existingLists,
        allowMissingConnectorSecrets,
      })
    );
    const importRulesChunkResponses = await importRulesChunkInMacrotask();

    for (const importResponse of importRulesChunkResponses) {
      result.push(importResponse);
    }
  }

  return result;
};
