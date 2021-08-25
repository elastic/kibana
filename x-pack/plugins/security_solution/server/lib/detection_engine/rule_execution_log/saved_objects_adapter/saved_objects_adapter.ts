/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'src/core/server';
import { SavedObjectsClientContract } from '../../../../../../../../src/core/server';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';
import { IRuleStatusSOAttributes } from '../../rules/types';
import {
  RuleStatusSavedObjectsClient,
  ruleStatusSavedObjectsClientFactory,
} from './rule_status_saved_objects_client';
import {
  ExecutionMetric,
  ExecutionMetricArgs,
  FindBulkExecutionLogArgs,
  FindExecutionLogArgs,
  IRuleExecutionLogClient,
  LegacyMetrics,
  LogStatusChangeArgs,
  UpdateExecutionLogArgs,
} from '../types';
import { assertUnreachable } from '../../../../../common';

// 1st is mutable status, followed by 5 most recent failures
export const MAX_RULE_STATUSES = 6;

const METRIC_FIELDS = {
  [ExecutionMetric.executionGap]: 'gap',
  [ExecutionMetric.searchDurationMax]: 'searchAfterTimeDurations',
  [ExecutionMetric.indexingDurationMax]: 'bulkCreateTimeDurations',
  [ExecutionMetric.indexingLookback]: 'lastLookBackDate',
} as const;

const getMetricField = <T extends ExecutionMetric>(metric: T) => METRIC_FIELDS[metric];

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
      search: ruleId,
      searchFields: ['alertId'],
    });
  }

  public findBulk({ ruleIds, logsCount = 1 }: FindBulkExecutionLogArgs) {
    return this.ruleStatusClient.findBulk(ruleIds, logsCount);
  }

  public async update({ id, attributes }: UpdateExecutionLogArgs) {
    await this.ruleStatusClient.update(id, attributes);
  }

  public async delete(id: string) {
    await this.ruleStatusClient.delete(id);
  }

  public async logExecutionMetric<T extends ExecutionMetric>({
    ruleId,
    metric,
    value,
  }: ExecutionMetricArgs<T>) {
    const [currentStatus] = await this.getOrCreateRuleStatuses(ruleId);

    await this.ruleStatusClient.update(currentStatus.id, {
      ...currentStatus.attributes,
      [getMetricField(metric)]: value,
    });
  }

  private createNewRuleStatus = async (
    ruleId: string
  ): Promise<SavedObject<IRuleStatusSOAttributes>> => {
    const now = new Date().toISOString();
    return this.ruleStatusClient.create({
      alertId: ruleId,
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
    });
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
    switch (newStatus) {
      case RuleExecutionStatus['going to run']:
      case RuleExecutionStatus.succeeded:
      case RuleExecutionStatus.warning:
      case RuleExecutionStatus['partial failure']: {
        const [currentStatus] = await this.getOrCreateRuleStatuses(ruleId);

        await this.ruleStatusClient.update(currentStatus.id, {
          ...currentStatus.attributes,
          ...buildRuleStatusAttributes(newStatus, message, metrics),
        });

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
        await this.ruleStatusClient.update(currentStatus.id, failureAttributes);
        const lastStatus = await this.ruleStatusClient.create(failureAttributes);

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
  metrics?: LegacyMetrics
) => Partial<IRuleStatusSOAttributes> = (status, message, metrics = {}) => {
  const now = new Date().toISOString();
  const baseAttributes: Partial<IRuleStatusSOAttributes> = {
    ...metrics,
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
