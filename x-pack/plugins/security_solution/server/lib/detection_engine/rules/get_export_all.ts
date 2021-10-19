/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformDataToNdjson } from '@kbn/securitysolution-utils';

import { ExceptionListClient } from '../../../../../lists/server';
import { RulesClient } from '../../../../../alerting/server';
import { getNonPackagedRules } from './get_existing_prepackaged_rules';
import { getExportDetailsNdjson } from './get_export_details_ndjson';
import { transformAlertsToRules } from '../routes/rules/utils';
import { getRuleExceptionsForExport } from './get_export_rule_exceptions';

export const getExportAll = async (
  rulesClient: RulesClient,
  exceptionsClient: ExceptionListClient | undefined,
  isRuleRegistryEnabled: boolean
): Promise<{
  rulesNdjson: string;
  exportDetails: string;
  exceptionLists: string | null;
}> => {
  const ruleAlertTypes = await getNonPackagedRules({ rulesClient, isRuleRegistryEnabled });
  const rules = transformAlertsToRules(ruleAlertTypes);
  const exceptions = rules.flatMap((rule) => rule.exceptions_list ?? []);
  const { listCount, itemsCount, exportString } = await getRuleExceptionsForExport(
    exceptions,
    exceptionsClient
  );
  const rulesNdjson = transformDataToNdjson(rules);
  const exportDetails = getExportDetailsNdjson(rules, [], {
    exported_exception_list_count: listCount,
    exported_exception_list_item_count: itemsCount,
    missing_exception_list_item_count: 0,
    missing_exception_list_items: [],
    missing_exception_lists: [],
    missing_exception_lists_count: 0,
  });
  return { rulesNdjson, exportDetails, exceptionLists: exportString };
};
