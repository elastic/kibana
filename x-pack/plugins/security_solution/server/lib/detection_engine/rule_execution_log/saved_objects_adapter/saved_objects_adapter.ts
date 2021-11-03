/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
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
  GetLastFailuresArgs,
  GetCurrentStatusArgs,
  GetCurrentStatusBulkArgs,
  GetCurrentStatusBulkResult,
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

  private findRuleStatusSavedObjects(ruleId: string, count: number) {
    return this.ruleStatusClient.find({
      perPage: count,
      sortField: 'statusDate',
      sortOrder: 'desc',
      ruleId,
    });
  }

  /** @deprecated */
  public find({ ruleId, logsCount = 1 }: FindExecutionLogArgs) {
    return this.findRuleStatusSavedObjects(ruleId, logsCount);
  }

  /** @deprecated */
  public findBulk({ ruleIds, logsCount = 1 }: FindBulkExecutionLogArgs) {
    return this.ruleStatusClient.findBulk(ruleIds, logsCount);
  }

  public async getLastFailures(args: GetLastFailuresArgs): Promise<IRuleStatusSOAttributes[]> {
    const result = await this.findRuleStatusSavedObjects(args.ruleId, MAX_RULE_STATUSES);

    // The first status is always the current one followed by 5 last failures.
    // We skip the current status and return only the failures.
    return result.map((so) => so.attributes).slice(1);
  }

  public async getCurrentStatus(
    args: GetCurrentStatusArgs
  ): Promise<IRuleStatusSOAttributes | undefined> {
    const result = await this.findRuleStatusSavedObjects(args.ruleId, 1);
    const currentStatusSavedObject = result[0];
    return currentStatusSavedObject?.attributes;
  }

  public async getCurrentStatusBulk(
    args: GetCurrentStatusBulkArgs
  ): Promise<GetCurrentStatusBulkResult> {
    const { ruleIds } = args;
    const result = await this.ruleStatusClient.findBulk(ruleIds, 1);
    return mapValues(result, (attributes = []) => attributes[0]);
  }

  public async deleteCurrentStatus(ruleId: string): Promise<void> {
    const statusSavedObjects = await this.findRuleStatusSavedObjects(ruleId, MAX_RULE_STATUSES);
    await Promise.all(statusSavedObjects.map((so) => this.ruleStatusClient.delete(so.id)));
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
    const existingStatuses = await this.findRuleStatusSavedObjects(ruleId, MAX_RULE_STATUSES);
    if (existingStatuses.length > 0) {
      return existingStatuses;
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
        await Promise.all(oldStatuses.map((status) => this.ruleStatusClient.delete(status.id)));

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
