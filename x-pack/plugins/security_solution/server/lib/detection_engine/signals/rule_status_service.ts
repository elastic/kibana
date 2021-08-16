/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertUnreachable } from '../../../../common/utility_types';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { IRuleStatusSOAttributes } from '../rules/types';
import { getOrCreateRuleStatuses } from './get_or_create_rule_statuses';
import { IRuleExecutionLogClient } from '../rule_execution_log/types';

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
  partialFailure: (message: string, attributes?: Attributes) => Promise<void>;
  error: (message: string, attributes?: Attributes) => Promise<void>;
}

export const buildRuleStatusAttributes: (
  status: RuleExecutionStatus,
  message?: string,
  attributes?: Attributes
) => Partial<IRuleStatusSOAttributes> = (status, message, attributes = {}) => {
  const now = new Date().toISOString();
  const baseAttributes: Partial<IRuleStatusSOAttributes> = {
    ...attributes,
    status,
    statusDate: now,
  };

  switch (status) {
    case RuleExecutionStatus.succeeded: {
      return {
        ...baseAttributes,
        lastSuccessAt: now,
        lastSuccessMessage: message,
      };
    }
    case RuleExecutionStatus.warning: {
      return {
        ...baseAttributes,
        lastSuccessAt: now,
        lastSuccessMessage: message,
      };
    }
    case RuleExecutionStatus['partial failure']: {
      return {
        ...baseAttributes,
        lastSuccessAt: now,
        lastSuccessMessage: message,
      };
    }
    case RuleExecutionStatus.failed: {
      return {
        ...baseAttributes,
        lastFailureAt: now,
        lastFailureMessage: message,
      };
    }
    case RuleExecutionStatus['going to run']: {
      return baseAttributes;
    }
  }

  assertUnreachable(status);
};

export const ruleStatusServiceFactory = async ({
  spaceId,
  alertId,
  ruleStatusClient,
}: {
  spaceId: string;
  alertId: string;
  ruleStatusClient: IRuleExecutionLogClient;
}): Promise<RuleStatusService> => {
  return {
    goingToRun: async () => {
      const [currentStatus] = await getOrCreateRuleStatuses({
        spaceId,
        alertId,
        ruleStatusClient,
      });

      await ruleStatusClient.update({
        id: currentStatus.id,
        attributes: {
          ...currentStatus.attributes,
          ...buildRuleStatusAttributes(RuleExecutionStatus['going to run']),
        },
        spaceId,
      });
    },

    success: async (message, attributes) => {
      const [currentStatus] = await getOrCreateRuleStatuses({
        spaceId,
        alertId,
        ruleStatusClient,
      });

      await ruleStatusClient.update({
        id: currentStatus.id,
        attributes: {
          ...currentStatus.attributes,
          ...buildRuleStatusAttributes(RuleExecutionStatus.succeeded, message, attributes),
        },
        spaceId,
      });
    },

    partialFailure: async (message, attributes) => {
      const [currentStatus] = await getOrCreateRuleStatuses({
        spaceId,
        alertId,
        ruleStatusClient,
      });

      await ruleStatusClient.update({
        id: currentStatus.id,
        attributes: {
          ...currentStatus.attributes,
          ...buildRuleStatusAttributes(RuleExecutionStatus['partial failure'], message, attributes),
        },
        spaceId,
      });
    },

    error: async (message, attributes) => {
      const ruleStatuses = await getOrCreateRuleStatuses({
        spaceId,
        alertId,
        ruleStatusClient,
      });
      const [currentStatus] = ruleStatuses;

      const failureAttributes = {
        ...currentStatus.attributes,
        ...buildRuleStatusAttributes(RuleExecutionStatus.failed, message, attributes),
      };

      // We always update the newest status, so to 'persist' a failure we push a copy to the head of the list
      await ruleStatusClient.update({
        id: currentStatus.id,
        attributes: failureAttributes,
        spaceId,
      });
      const newStatus = await ruleStatusClient.create({ attributes: failureAttributes, spaceId });

      // drop oldest failures
      const oldStatuses = [newStatus, ...ruleStatuses].slice(MAX_RULE_STATUSES);
      await Promise.all(oldStatuses.map((status) => ruleStatusClient.delete(status.id)));
    },
  };
};
