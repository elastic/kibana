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
  // Grab all relevant exception lists associated
  // NOTE: soon enough we won't be stripping the actions, so this should
  // update to just return the exceptionLists
  const { rules: rulesWithoutActions, exceptionLists } = await getRuleExceptionsForExport(
    rules,
    exceptionsClient
  );
  const rulesNdjson = transformDataToNdjson(rulesWithoutActions);
  const exportDetails = getExportDetailsNdjson(rules);
  return { rulesNdjson, exportDetails, exceptionLists };
};
