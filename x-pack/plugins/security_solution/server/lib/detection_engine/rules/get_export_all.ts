/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient } from '../../../../../alerting/server';
import { getNonPackagedRules } from './get_existing_prepackaged_rules';
import { getExportDetailsNdjson } from './get_export_details_ndjson';
import { transformAlertsToRules } from '../routes/rules/utils';
import { transformDataToNdjson } from '../../../utils/read_stream/create_stream_from_ndjson';

export const getExportAll = async (
  rulesClient: RulesClient,
  isRuleRegistryEnabled: boolean
): Promise<{
  rulesNdjson: string;
  exportDetails: string;
}> => {
  const ruleAlertTypes = await getNonPackagedRules({ rulesClient, isRuleRegistryEnabled });
  const rules = transformAlertsToRules(ruleAlertTypes);
  // We do not support importing/exporting actions. When we do, delete this line of code
  const rulesWithoutActions = rules.map((rule) => ({ ...rule, actions: [] }));
  const rulesNdjson = transformDataToNdjson(rulesWithoutActions);
  const exportDetails = getExportDetailsNdjson(rules);
  return { rulesNdjson, exportDetails };
};
