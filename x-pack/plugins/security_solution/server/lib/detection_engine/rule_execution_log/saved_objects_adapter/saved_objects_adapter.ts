/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectReference } from 'src/core/server';
import { SavedObjectsClientContract } from '../../../../../../../../src/core/server';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';
// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleReference } from '../../rules/legacy_rule_status/legacy_utils';

import { IRuleStatusSOAttributes } from '../../rules/types';
import {
  RuleStatusSavedObjectsClient,
  ruleStatusSavedObjectsClientFactory,
} from './rule_status_saved_objects_client';
import {
  LogExecutionMetricsArgs,
  FindBulkExecutionLogArgs,
  FindExecutionLogArgs,
  IRuleExecutionLogClient,
  ExecutionMetrics,
  LogStatusChangeArgs,
  UpdateExecutionLogArgs,
} from '../types';
import { assertUnreachable } from '../../../../../common';

// 1st is mutable status, followed by 5 most recent failures
export const MAX_RULE_STATUSES = 6;

const convertMetricFields = (
  metrics: ExecutionMetrics
): Pick<
  IRuleStatusSOAttributes,
  'gap' | 'searchAfterTimeDurations' | 'bulkCreateTimeDurations'
> => ({
  gap: metrics.executionGap?.humanize(),
  searchAfterTimeDurations: metrics.searchDurations,
  bulkCreateTimeDurations: metrics.indexingDurations,
});

export class SavedObjectsAdapter implements IRuleExecutionLogClient {
  private ruleStatusClient: RuleStatusSavedObjectsClient;

  constructor(savedObjectsClient: SavedObjectsClientContract) {
    this.ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
  }

  public find({ ruleId, logsCount = 1 }: FindExecutionLogArgs) {
    return this.ruleStatusClient.find({
      perPage: logsCount,
      sortField: 'statusDate',
      sortOrder: 'desc',
      ruleId,
    });
  }

  public findBulk({ ruleIds, logsCount = 1 }: FindBulkExecutionLogArgs) {
    return this.ruleStatusClient.findBulk(ruleIds, logsCount);
  }

  public async update({ id, attributes, ruleId }: UpdateExecutionLogArgs) {
    const references: SavedObjectReference[] = [legacyGetRuleReference(ruleId)];
    await this.ruleStatusClient.update(id, attributes, { references });
  }

  public async delete(id: string) {
    await this.ruleStatusClient.delete(id);
  }

  public async logExecutionMetrics({ ruleId, metrics }: LogExecutionMetricsArgs) {
    const references: SavedObjectReference[] = [legacyGetRuleReference(ruleId)];
    const [currentStatus] = await this.getOrCreateRuleStatuses(ruleId);

    await this.ruleStatusClient.update(
      currentStatus.id,
      {
        ...currentStatus.attributes,
        ...convertMetricFields(metrics),
      },
      { references }
    );
  }

  private createNewRuleStatus = async (
    ruleId: string
  ): Promise<SavedObject<IRuleStatusSOAttributes>> => {
    const references: SavedObjectReference[] = [legacyGetRuleReference(ruleId)];
    const now = new Date().toISOString();
    return this.ruleStatusClient.create(
      {
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
      { references }
    );
  };

  private getOrCreateRuleStatuses = async (
    ruleId: string
  ): Promise<Array<SavedObject<IRuleStatusSOAttributes>>> => {
    const ruleStatuses = await this.find({
      spaceId: '', // spaceId is a required argument but it's not used by savedObjectsClient, any string would work here
      ruleId,
      logsCount: MAX_RULE_STATUSES,
    });
    if (ruleStatuses.length > 0) {
      return ruleStatuses;
    }
    const newStatus = await this.createNewRuleStatus(ruleId);

    return [newStatus];
  };

  public async logStatusChange({ newStatus, ruleId, message, metrics }: LogStatusChangeArgs) {
    const references: SavedObjectReference[] = [legacyGetRuleReference(ruleId)];

    switch (newStatus) {
      case RuleExecutionStatus['going to run']:
      case RuleExecutionStatus.succeeded:
      case RuleExecutionStatus.warning:
      case RuleExecutionStatus['partial failure']: {
        const [currentStatus] = await this.getOrCreateRuleStatuses(ruleId);

        await this.ruleStatusClient.update(
          currentStatus.id,
          {
            ...currentStatus.attributes,
            ...buildRuleStatusAttributes(newStatus, message, metrics),
          },
          { references }
        );

        return;
      }

      case RuleExecutionStatus.failed: {
        const ruleStatuses = await this.getOrCreateRuleStatuses(ruleId);
        const [currentStatus] = ruleStatuses;

        const failureAttributes = {
          ...currentStatus.attributes,
          ...buildRuleStatusAttributes(RuleExecutionStatus.failed, message, metrics),
        };

        // We always update the newest status, so to 'persist' a failure we push a copy to the head of the list
        await this.ruleStatusClient.update(currentStatus.id, failureAttributes, { references });
        const lastStatus = await this.ruleStatusClient.create(failureAttributes, { references });

        // drop oldest failures
        const oldStatuses = [lastStatus, ...ruleStatuses].slice(MAX_RULE_STATUSES);
        await Promise.all(oldStatuses.map((status) => this.delete(status.id)));

        return;
      }
      default:
        assertUnreachable(newStatus, 'Unknown rule execution status supplied to logStatusChange');
    }
  }
}

const buildRuleStatusAttributes: (
  status: RuleExecutionStatus,
  message?: string,
  metrics?: ExecutionMetrics
) => Partial<IRuleStatusSOAttributes> = (status, message, metrics = {}) => {
  const now = new Date().toISOString();
  const baseAttributes: Partial<IRuleStatusSOAttributes> = {
    ...convertMetricFields(metrics),
    status:
      status === RuleExecutionStatus.warning ? RuleExecutionStatus['partial failure'] : status,
    statusDate: now,
  };

  switch (status) {
    case RuleExecutionStatus.succeeded:
    case RuleExecutionStatus.warning:
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
};
