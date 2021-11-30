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
  ExecutionMetrics,
  FindBulkExecutionLogArgs,
  FindExecutionLogArgs,
  GetCurrentStatusArgs,
  GetCurrentStatusBulkArgs,
  GetCurrentStatusBulkResult,
  GetLastFailuresArgs,
  IRuleExecutionLogClient,
  LogStatusChangeArgs,
} from '../types';
import {
  RuleStatusSavedObjectsClient,
  ruleStatusSavedObjectsClientFactory,
} from './rule_status_saved_objects_client';

const MAX_ERRORS = 5;
// 1st is mutable status, followed by 5 most recent failures
const MAX_RULE_STATUSES = 1 + MAX_ERRORS;

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

  private findRuleStatuses = async (
    ruleId: string
  ): Promise<Array<SavedObject<IRuleStatusSOAttributes>>> =>
    this.findRuleStatusSavedObjects(ruleId, MAX_RULE_STATUSES);

  public async logStatusChange({ newStatus, ruleId, message, metrics }: LogStatusChangeArgs) {
    const references: SavedObjectReference[] = [legacyGetRuleReference(ruleId)];
    const ruleStatuses = await this.findRuleStatuses(ruleId);
    const [currentStatus] = ruleStatuses;
    const attributes = buildRuleStatusAttributes({
      status: newStatus,
      message,
      metrics,
      currentAttributes: currentStatus?.attributes,
    });
    // Create or update current status
    if (currentStatus) {
      await this.ruleStatusClient.update(currentStatus.id, attributes, { references });
    } else {
      await this.ruleStatusClient.create(attributes, { references });
    }

    if (newStatus === RuleExecutionStatus.failed) {
      await Promise.all([
        // Persist the current failure in the last five errors list
        this.ruleStatusClient.create(attributes, { references }),
        // Drop oldest failures
        ...ruleStatuses
          .slice(MAX_RULE_STATUSES - 1)
          .map((status) => this.ruleStatusClient.delete(status.id)),
      ]);
    }
  }
}

const defaultStatusAttributes: IRuleStatusSOAttributes = {
  statusDate: '',
  status: RuleExecutionStatus['going to run'],
  lastFailureAt: null,
  lastSuccessAt: null,
  lastFailureMessage: null,
  lastSuccessMessage: null,
  gap: null,
  bulkCreateTimeDurations: [],
  searchAfterTimeDurations: [],
  lastLookBackDate: null,
};

const buildRuleStatusAttributes = ({
  status,
  message,
  metrics = {},
  currentAttributes,
}: {
  status: RuleExecutionStatus;
  message?: string;
  metrics?: ExecutionMetrics;
  currentAttributes?: IRuleStatusSOAttributes;
}): IRuleStatusSOAttributes => {
  const now = new Date().toISOString();
  const baseAttributes: IRuleStatusSOAttributes = {
    ...defaultStatusAttributes,
    ...currentAttributes,
    statusDate: now,
    status:
      status === RuleExecutionStatus.warning ? RuleExecutionStatus['partial failure'] : status,
    ...convertMetricFields(metrics),
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
