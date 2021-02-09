/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResponse } from 'kibana/server';
import { IRuleStatusSOAttributes } from '../rules/types';
import { MAX_RULE_STATUSES } from './rule_status_service';
import { RuleStatusSavedObjectsClient } from './rule_status_saved_objects_client';

interface GetRuleStatusSavedObject {
  alertId: string;
  ruleStatusClient: RuleStatusSavedObjectsClient;
}

export const getRuleStatusSavedObjects = async ({
  alertId,
  ruleStatusClient,
}: GetRuleStatusSavedObject): Promise<SavedObjectsFindResponse<IRuleStatusSOAttributes>> => {
  return ruleStatusClient.find({
    perPage: MAX_RULE_STATUSES,
    sortField: 'statusDate',
    sortOrder: 'desc',
    search: `${alertId}`,
    searchFields: ['alertId'],
  });
};
