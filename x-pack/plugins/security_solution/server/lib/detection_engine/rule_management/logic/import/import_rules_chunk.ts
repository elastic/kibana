/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import type { MlAuthz } from '../../../../machine_learning/authz';
import { sanitizeRuleExceptionReferences } from './sanitize_rule_exception_references';
import { importRule } from './import_rule';

export type PromiseFromStreams = RuleToImport | Error;

export interface RuleExceptionsPromiseFromStreams {
  rules: PromiseFromStreams[];
  exceptions: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema>;
  actionConnectors: SavedObject[];
}

export async function importRulesChunk({
  rulesToImport,
  overwriteExistingRules,
  rulesClient,
  mlAuthz,
  existingLists,
  allowMissingConnectorSecrets,
}: {
  rulesToImport: PromiseFromStreams[];
  overwriteExistingRules: boolean;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  existingLists: Record<string, ExceptionListSchema>;
  allowMissingConnectorSecrets?: boolean;
}): Promise<ImportRuleResponse[]> {
  const result: ImportRuleResponse[] = [];
  const importRulePromises: Array<Promise<ImportRuleResponse>> = [];

  for (const ruleToImport of rulesToImport) {
    if (ruleToImport instanceof Error) {
      // If the JSON object had a validation or parse error then we return
      // early with the error and an (unknown) for the ruleId
      result.push(
        createBulkErrorObject({
          statusCode: 400,
          message: ruleToImport.message,
        })
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    const exceptionErrors = sanitizeRuleExceptionReferences({
      rule: ruleToImport,
      existingLists,
    });

    for (const exceptionError of exceptionErrors) {
      result.push(exceptionError);
    }

    importRulePromises.push(
      importRule({
        ruleToImport,
        mlAuthz,
        overwriteExisting: overwriteExistingRules,
        rulesClient,
        allowMissingConnectorSecrets,
      })
    );
  }

  const importRuleResults = await Promise.all(importRulePromises);

  for (const importRuleResult of importRuleResults) {
    result.push(importRuleResult);
  }

  return result;
}
