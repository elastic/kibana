/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JobStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { assertUnreachable } from '../../../utils/build_query';
import { IRuleStatusAttributes } from '../rules/types';
import { getOrCreateRuleStatuses } from './get_or_create_rule_statuses';
import { RuleStatusSavedObjectsClient } from './rule_status_saved_objects_client';

// 1st is mutable status, followed by 5 most recent failures
export const MAX_RULE_STATUSES = 6;

interface Attributes {
  searchAfterTimeDurations?: string[];
  bulkCreateTimeDurations?: string[];
  lastLookBackDate?: string;
  gap?: string;
}

export interface RuleStatusService {
  goingToRun: () => Promise<void>;
  success: (message: string, attributes?: Attributes) => Promise<void>;
  error: (message: string, attributes?: Attributes) => Promise<void>;
}

export const buildRuleStatusAttributes: (
  status: JobStatus,
  message?: string,
  attributes?: Attributes
) => Partial<IRuleStatusAttributes> = (status, message, attributes = {}) => {
  const now = new Date().toISOString();
  const baseAttributes: Partial<IRuleStatusAttributes> = {
    ...attributes,
    status,
    statusDate: now,
  };

  switch (status) {
    case 'succeeded': {
      return {
        ...baseAttributes,
        lastSuccessAt: now,
        lastSuccessMessage: message,
      };
    }
    case 'failed': {
      return {
        ...baseAttributes,
        lastFailureAt: now,
        lastFailureMessage: message,
      };
    }
    case 'going to run': {
      return baseAttributes;
    }
  }

  assertUnreachable(status);
};

export const ruleStatusServiceFactory = async ({
  alertId,
  ruleStatusClient,
}: {
  alertId: string;
  ruleStatusClient: RuleStatusSavedObjectsClient;
}): Promise<RuleStatusService> => {
  return {
    goingToRun: async () => {
      const [currentStatus] = await getOrCreateRuleStatuses({
        alertId,
        ruleStatusClient,
      });

      await ruleStatusClient.update(currentStatus.id, {
        ...currentStatus.attributes,
        ...buildRuleStatusAttributes('going to run'),
      });
    },

    success: async (message, attributes) => {
      const [currentStatus] = await getOrCreateRuleStatuses({
        alertId,
        ruleStatusClient,
      });

      await ruleStatusClient.update(currentStatus.id, {
        ...currentStatus.attributes,
        ...buildRuleStatusAttributes('succeeded', message, attributes),
      });
    },

    error: async (message, attributes) => {
      const ruleStatuses = await getOrCreateRuleStatuses({
        alertId,
        ruleStatusClient,
      });
      const [currentStatus] = ruleStatuses;

      const failureAttributes = {
        ...currentStatus.attributes,
        ...buildRuleStatusAttributes('failed', message, attributes),
      };

      // We always update the newest status, so to 'persist' a failure we push a copy to the head of the list
      await ruleStatusClient.update(currentStatus.id, failureAttributes);
      const newStatus = await ruleStatusClient.create(failureAttributes);

      // drop oldest failures
      const oldStatuses = [newStatus, ...ruleStatuses].slice(MAX_RULE_STATUSES);
      await Promise.all(oldStatuses.map((status) => ruleStatusClient.delete(status.id)));
    },
  };
};
