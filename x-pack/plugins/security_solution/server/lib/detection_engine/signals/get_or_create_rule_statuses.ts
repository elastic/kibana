/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'src/core/server';

import { IRuleStatusSOAttributes } from '../rules/types';
import { RuleStatusSavedObjectsClient } from './rule_status_saved_objects_client';
import { getRuleStatusSavedObjects } from './get_rule_status_saved_objects';

interface RuleStatusParams {
  alertId: string;
  ruleStatusClient: RuleStatusSavedObjectsClient;
}

export const createNewRuleStatus = async ({
  alertId,
  ruleStatusClient,
}: RuleStatusParams): Promise<SavedObject<IRuleStatusSOAttributes>> => {
  const now = new Date().toISOString();
  return ruleStatusClient.create({
    alertId,
    statusDate: now,
    status: 'going to run',
    lastFailureAt: null,
    lastSuccessAt: null,
    lastFailureMessage: null,
    lastSuccessMessage: null,
    gap: null,
    bulkCreateTimeDurations: [],
    searchAfterTimeDurations: [],
    lastLookBackDate: null,
  });
};

export const getOrCreateRuleStatuses = async ({
  alertId,
  ruleStatusClient,
}: RuleStatusParams): Promise<Array<SavedObject<IRuleStatusSOAttributes>>> => {
  const ruleStatuses = await getRuleStatusSavedObjects({
    alertId,
    ruleStatusClient,
  });
  if (ruleStatuses.saved_objects.length > 0) {
    return ruleStatuses.saved_objects;
  }
  const newStatus = await createNewRuleStatus({ alertId, ruleStatusClient });

  return [newStatus];
};
