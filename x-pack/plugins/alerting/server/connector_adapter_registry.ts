/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObjectType } from '@kbn/config-schema';
import type { RuleActionParams, RuleNotifyWhenType } from '../common';
import type {
  TransformActionParamsOptions,
  TransformSummaryActionParamsOpts,
} from './task_runner/transform_action_params';

export type ConnectorAdapterActionGroup = 'active' | 'recovered';

export interface ConnectorAdapterConfig {
  connectorTypeId: string;
  ruleActionParamsSchema: ObjectType;
  limitActionGroups?: ConnectorAdapterActionGroup[];
  limitPerAlertActionFrequency?: RuleNotifyWhenType[];
  allowThrottledSummaries?: boolean;
  augmentActionParams: (
    actionParams: RuleActionParams,
    payload: TransformActionParamsOptions
  ) => RuleActionParams;
  augmentSummaryActionParams: (
    actionParams: RuleActionParams,
    payload: TransformSummaryActionParamsOpts
  ) => RuleActionParams;
}

export class ConnectorAdapterRegistry {
  private readonly connectorAdapters: Map<string, ConnectorAdapterConfig> = new Map();

  public register(config: ConnectorAdapterConfig) {
    if (this.connectorAdapters.has(config.connectorTypeId)) {
      throw new Error(
        `${config.connectorTypeId} is already registered to the ConnectorAdapterRegistry`
      );
    }

    this.connectorAdapters.set(config.connectorTypeId, config);
  }

  public get(connectorTypeId: string): ConnectorAdapterConfig | undefined {
    return this.connectorAdapters.get(connectorTypeId);
  }

  public list() {
    return Array.from(this.connectorAdapters.values()).map((connectorAdapter) => ({
      connectorTypeId: connectorAdapter.connectorTypeId,
      limitActionGroups: connectorAdapter.limitActionGroups,
      limitPerAlertActionFrequency: connectorAdapter.limitPerAlertActionFrequency,
      allowThrottledSummaries: connectorAdapter.allowThrottledSummaries,
    }));
  }
}
