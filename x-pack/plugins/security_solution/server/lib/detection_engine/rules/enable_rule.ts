/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { SanitizedAlert } from '../../../../../alerting/common';
import { AlertsClient } from '../../../../../alerting/server';
import { RuleParams } from '../schemas/rule_schemas';
import { ruleStatusSavedObjectsClientFactory } from '../signals/rule_status_saved_objects_client';

interface EnableRuleArgs {
  rule: SanitizedAlert<RuleParams>;
  alertsClient: AlertsClient;
  savedObjectsClient: SavedObjectsClientContract;
}

/**
 * Enables the rule and updates its status to 'going to run'
 *
 * @param rule - rule to enable
 * @param alertsClient - Alerts client
 * @param savedObjectsClient - Saved Objects client
 */
export const enableRule = async ({ rule, alertsClient, savedObjectsClient }: EnableRuleArgs) => {
  await alertsClient.enable({ id: rule.id });

  const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
  const ruleCurrentStatus = await ruleStatusClient.find({
    perPage: 1,
    sortField: 'statusDate',
    sortOrder: 'desc',
    search: rule.id,
    searchFields: ['alertId'],
  });

  // set current status for this rule to be 'going to run'
  if (ruleCurrentStatus && ruleCurrentStatus.saved_objects.length > 0) {
    const currentStatusToDisable = ruleCurrentStatus.saved_objects[0];
    await ruleStatusClient.update(currentStatusToDisable.id, {
      ...currentStatusToDisable.attributes,
      status: 'going to run',
    });
  }
};
