/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '../../../../../../../src/core/server';
import { RuleRegistryAdapter } from './rule_registry_adapter/rule_registry_adapter';
import { SavedObjectsAdapter } from './saved_objects_adapter/saved_objects_adapter';
import {
  ExecutionMetric,
  ExecutionMetricArgs,
  FindBulkExecutionLogArgs,
  FindExecutionLogArgs,
  IRuleDataPluginService,
  IRuleExecutionLogClient,
  LogStatusChangeArgs,
  UpdateExecutionLogArgs,
} from './types';

export interface RuleExecutionLogClientArgs {
  isRuleRegistryEnabled: boolean;
  ruleDataService: IRuleDataPluginService;
  savedObjectsClient: SavedObjectsClientContract;
}

export class RuleExecutionLogClient implements IRuleExecutionLogClient {
  private client: IRuleExecutionLogClient;

  constructor({
    isRuleRegistryEnabled,
    ruleDataService,
    savedObjectsClient,
  }: RuleExecutionLogClientArgs) {
    if (isRuleRegistryEnabled) {
      this.client = new RuleRegistryAdapter(ruleDataService);
    } else {
      this.client = new SavedObjectsAdapter(savedObjectsClient);
    }
  }

  public find(args: FindExecutionLogArgs) {
    return this.client.find(args);
  }

  public findBulk(args: FindBulkExecutionLogArgs) {
    return this.client.findBulk(args);
  }

  public async update(args: UpdateExecutionLogArgs) {
    return this.client.update(args);
  }

  public async delete(id: string) {
    return this.client.delete(id);
  }

  public async logExecutionMetric<T extends ExecutionMetric>(args: ExecutionMetricArgs<T>) {
    return this.client.logExecutionMetric(args);
  }

  public async logStatusChange(args: LogStatusChangeArgs) {
    return this.client.logStatusChange(args);
  }
}
