/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformDataToNdjson } from '@kbn/securitysolution-utils';

import { Logger } from 'src/core/server';
import { ExceptionListClient } from '../../../../../lists/server';
import { RulesClient, RuleExecutorServices } from '../../../../../alerting/server';
import { getNonPackagedRules } from './get_existing_prepackaged_rules';
import { getExportDetailsNdjson } from './get_export_details_ndjson';
import { transformAlertsToRules } from '../routes/rules/utils';
import { getRuleExceptionsForExport } from './get_export_rule_exceptions';

// eslint-disable-next-line no-restricted-imports
import { legacyGetBulkRuleActionsSavedObject } from '../rule_actions/legacy_get_bulk_rule_actions_saved_object';

export const getExportAll = async (
  rulesClient: RulesClient,
  exceptionsClient: ExceptionListClient | undefined,
  savedObjectsClient: RuleExecutorServices['savedObjectsClient'],
  logger: Logger,
  isRuleRegistryEnabled: boolean
): Promise<{
  rulesNdjson: string;
  exportDetails: string;
  exceptionLists: string | null;
}> => {
  const ruleAlertTypes = await getNonPackagedRules({ rulesClient, isRuleRegistryEnabled });
  const alertIds = ruleAlertTypes.map((rule) => rule.id);

  // Gather actions
  const legacyActions = await legacyGetBulkRuleActionsSavedObject({
    alertIds,
    savedObjectsClient,
    logger,
  });
  const rules = transformAlertsToRules(ruleAlertTypes, legacyActions);

  // Gather exceptions
  const exceptions = rules.flatMap((rule) => rule.exceptions_list ?? []);
  const { exportData: exceptionLists, exportDetails: exceptionDetails } =
    await getRuleExceptionsForExport(exceptions, exceptionsClient);

  const rulesNdjson = transformDataToNdjson(rules);
  const exportDetails = getExportDetailsNdjson(rules, [], exceptionDetails);
  return { rulesNdjson, exportDetails, exceptionLists };
};
