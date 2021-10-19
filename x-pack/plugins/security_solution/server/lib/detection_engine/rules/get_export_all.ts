/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformDataToNdjson } from '@kbn/securitysolution-utils';

import { Logger } from 'src/core/server';
import { RulesClient, AlertServices } from '../../../../../alerting/server';
import { getNonPackagedRules } from './get_existing_prepackaged_rules';
import { getExportDetailsNdjson } from './get_export_details_ndjson';
import { transformAlertsToRules } from '../routes/rules/utils';

// eslint-disable-next-line no-restricted-imports
import { legacyGetBulkRuleActionsSavedObject } from '../rule_actions/legacy_get_bulk_rule_actions_saved_object';

export const getExportAll = async (
  rulesClient: RulesClient,
  savedObjectsClient: AlertServices['savedObjectsClient'],
  logger: Logger,
  isRuleRegistryEnabled: boolean
): Promise<{
  rulesNdjson: string;
  exportDetails: string;
}> => {
  const ruleAlertTypes = await getNonPackagedRules({ rulesClient, isRuleRegistryEnabled });
  const alertIds = ruleAlertTypes.map((rule) => rule.id);
  const legacyActions = await legacyGetBulkRuleActionsSavedObject({
    alertIds,
    savedObjectsClient,
    logger,
  });

  const rules = transformAlertsToRules(ruleAlertTypes, legacyActions);
  // We do not support importing/exporting actions. When we do, delete this line of code
  const rulesWithoutActions = rules.map((rule) => ({ ...rule, actions: [] }));
  const rulesNdjson = transformDataToNdjson(rulesWithoutActions);
  const exportDetails = getExportDetailsNdjson(rules);
  return { rulesNdjson, exportDetails };
};
