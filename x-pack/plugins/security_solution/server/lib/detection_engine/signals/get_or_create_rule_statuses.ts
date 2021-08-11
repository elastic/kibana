/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'src/core/server';

import { IRuleStatusSOAttributes } from '../rules/types';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { IRuleExecutionLogClient } from '../rule_execution_log/types';
import { MAX_RULE_STATUSES } from './rule_status_service';

interface RuleStatusParams {
  alertId: string;
  spaceId: string;
  ruleStatusClient: IRuleExecutionLogClient;
}

export const createNewRuleStatus = async ({
  alertId,
  spaceId,
  ruleStatusClient,
}: RuleStatusParams): Promise<SavedObject<IRuleStatusSOAttributes>> => {
  const now = new Date().toISOString();
  return ruleStatusClient.create({
    spaceId,
    attributes: {
      alertId,
      statusDate: now,
      status: RuleExecutionStatus['going to run'],
      lastFailureAt: null,
      lastSuccessAt: null,
      lastFailureMessage: null,
      lastSuccessMessage: null,
      gap: null,
      bulkCreateTimeDurations: [],
      searchAfterTimeDurations: [],
      lastLookBackDate: null,
    },
  });
};

export const getOrCreateRuleStatuses = async ({
  spaceId,
  alertId,
  ruleStatusClient,
}: RuleStatusParams): Promise<Array<SavedObject<IRuleStatusSOAttributes>>> => {
  const ruleStatuses = await ruleStatusClient.find({
    spaceId,
    ruleId: alertId,
    logsCount: MAX_RULE_STATUSES,
  });
  if (ruleStatuses.length > 0) {
    return ruleStatuses;
  }
  const newStatus = await createNewRuleStatus({ alertId, spaceId, ruleStatusClient });

  return [newStatus];
};
