/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { RuleResponse, RuleToImport } from '../../../../../../../common/api/detection_engine';
import { ruleToImportHasVersion } from '../../../../../../../common/api/detection_engine/rule_management';
import type { PrebuiltRulesImportHelper } from '../../../../prebuilt_rules/logic/prebuilt_rules_import_helper';
import {
  type RuleImportErrorObject,
  createRuleImportErrorObject,
  isRuleImportError,
} from '../../import/errors';
import { checkRuleExceptionReferences } from '../../import/check_rule_exception_references';
import { calculateRuleSourceForImport } from '../../import/calculate_rule_source_for_import';
import { getReferencedExceptionLists } from '../../import/gather_referenced_exceptions';
import type { IDetectionRulesClient } from '../detection_rules_client_interface';

/**
 * Imports rules
 */

export const importRules = async ({
  allowMissingConnectorSecrets,
  detectionRulesClient,
  overwriteRules,
  prebuiltRulesImportHelper,
  rules,
  savedObjectsClient,
}: {
  allowMissingConnectorSecrets?: boolean;
  detectionRulesClient: IDetectionRulesClient;
  overwriteRules: boolean;
  prebuiltRulesImportHelper: PrebuiltRulesImportHelper;
  rules: RuleToImport[];
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<Array<RuleResponse | RuleImportErrorObject>> => {
  const existingLists = await getReferencedExceptionLists({
    rules,
    savedObjectsClient,
  });
  const prebuiltRuleAssets = await prebuiltRulesImportHelper.fetchMatchingAssets({
    rules,
  });

  const installedRuleIds = await prebuiltRulesImportHelper.fetchAssetRuleIds({
    rules,
  });

  return Promise.all(
    rules.map(async (rule) => {
      if (!ruleToImportHasVersion(rule)) {
        return createRuleImportErrorObject({
          message: i18n.translate(
            'xpack.securitySolution.detectionEngine.rules.cannotImportRuleWithoutVersion',
            {
              defaultMessage: 'Rules must specify a "version" to be imported. [rule_id: {ruleId}]',
              values: { ruleId: rule.rule_id },
            }
          ),
          ruleId: rule.rule_id,
        });
      }

      const errors: RuleImportErrorObject[] = [];

      const { immutable, ruleSource } = calculateRuleSourceForImport({
        rule,
        prebuiltRuleAssets,
        installedRuleIds,
      });

      try {
        const [exceptionErrors, exceptions] = checkRuleExceptionReferences({
          rule,
          existingLists,
        });
        errors.push(...exceptionErrors);

        const importedRule = await detectionRulesClient.importRule({
          ruleToImport: {
            ...rule,
            rule_source: ruleSource,
            immutable,
            exceptions_list: [...exceptions],
          },
          overwriteRules,
          allowMissingConnectorSecrets,
        });

        return [...errors, importedRule];
      } catch (err) {
        const { error, message } = err;

        const caughtError = isRuleImportError(err)
          ? err
          : createRuleImportErrorObject({
              ruleId: rule.rule_id,
              message: message ?? error?.message ?? 'unknown error',
            });

        return [...errors, caughtError];
      }
    })
  ).then((results) => results.flat());
};
