/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { RuleDataPluginService } from '../../../../../../rule_registry/server';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';
import { IRuleStatusSOAttributes } from '../../rules/types';
import { RuleRegistryLogClient } from '../rule_registry_log_client/rule_registry_log_client';
import {
  ExecutionMetric,
  ExecutionMetricArgs,
  FindBulkExecutionLogArgs,
  FindExecutionLogArgs,
  IRuleExecutionLogClient,
  LogStatusChangeArgs,
} from '../types';

/**
 * @deprecated RuleRegistryAdapter is kept here only as a reference. It will be superseded with EventLog implementation
 */
export class RuleRegistryAdapter implements IRuleExecutionLogClient {
  private ruleRegistryClient: RuleRegistryLogClient;

  constructor(ruleDataService: RuleDataPluginService) {
    this.ruleRegistryClient = new RuleRegistryLogClient(ruleDataService);
  }

  public async find({ ruleId, logsCount = 1, spaceId }: FindExecutionLogArgs) {
    const logs = await this.ruleRegistryClient.find({
      ruleIds: [ruleId],
      logsCount,
      spaceId,
    });

    return logs[ruleId].map((log) => ({
      id: '',
      type: '',
      score: 0,
      attributes: log,
      references: [],
    }));
  }

  public async findBulk({ ruleIds, logsCount = 1, spaceId }: FindBulkExecutionLogArgs) {
    const [statusesById, lastErrorsById] = await Promise.all([
      this.ruleRegistryClient.find({ ruleIds, spaceId }),
      this.ruleRegistryClient.find({
        ruleIds,
        statuses: [RuleExecutionStatus.failed],
        logsCount,
        spaceId,
      }),
    ]);
    return merge(statusesById, lastErrorsById);
  }

  public async create(event: IRuleStatusSOAttributes, spaceId: string) {
    if (event.status) {
      await this.ruleRegistryClient.logStatusChange({
        ruleId: event.alertId,
        newStatus: event.status,
        spaceId,
      });
    }

    if (event.bulkCreateTimeDurations) {
      await this.ruleRegistryClient.logExecutionMetric({
        ruleId: event.alertId,
        metric: ExecutionMetric.indexingDurationMax,
        value: Math.max(...event.bulkCreateTimeDurations.map(Number)),
        spaceId,
      });
    }

    if (event.gap) {
      await this.ruleRegistryClient.logExecutionMetric({
        ruleId: event.alertId,
        metric: ExecutionMetric.executionGap,
        value: Number(event.gap),
        spaceId,
      });
    }
  }

  public async update(id: string, event: IRuleStatusSOAttributes, spaceId: string) {
    // execution events are immutable, so we just use 'create' here instead of 'update'
    await this.create(event, spaceId);
  }

  public async delete(id: string) {
    // execution events are immutable, nothing to do here
  }

  public async logExecutionMetric<T extends ExecutionMetric>(args: ExecutionMetricArgs<T>) {
    return this.ruleRegistryClient.logExecutionMetric(args);
  }

  public async logStatusChange(args: LogStatusChangeArgs) {
    return this.ruleRegistryClient.logStatusChange(args);
  }
}
