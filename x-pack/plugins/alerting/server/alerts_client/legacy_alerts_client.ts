/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { Alert, createAlertFactory } from '../alert';
import {
  AlertFactory,
  getPublicAlertFactory,
  PublicAlertFactory,
} from '../alert/create_alert_factory';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RawAlertInstance,
  WithoutReservedActionGroups,
} from '../types';
import { IAlertsClient, InitializeOpts } from './types';

interface AlertsClientParams {
  logger: Logger;
  ruleType: UntypedNormalizedRuleType;
  maxAlerts: number;
}

export class LegacyAlertsClient<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> implements IAlertsClient
{
  private alerts: Record<string, Alert<State, Context>>;
  private alertFactory?: AlertFactory<
    State,
    Context,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  >;
  private ruleLogPrefix: string;
  constructor(private readonly options: AlertsClientParams) {
    this.alerts = {};
    this.ruleLogPrefix = `${this.options.ruleType.id}`;
  }

  public async initialize({ rule, deserializedAlerts }: InitializeOpts) {
    if (!deserializedAlerts) {
      return;
    }

    this.ruleLogPrefix = `${this.options.ruleType.id}:${rule.id}: '${rule.name}'`;

    for (const id in deserializedAlerts) {
      if (deserializedAlerts.hasOwnProperty(id)) {
        this.alerts[id] = new Alert<State, Context>(id, deserializedAlerts[id]);
      }
    }
    this.alertFactory = createAlertFactory<
      State,
      Context,
      WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
    >({
      alerts: this.alerts,
      logger: this.options.logger,
      maxAlerts: this.options.maxAlerts,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
    });
  }

  public hasReachedAlertLimit(): boolean {
    return this.alertFactory!.hasReachedAlertLimit();
  }

  public getExecutorServices(): PublicAlertFactory {
    return getPublicAlertFactory(this.alertFactory!);
  }
}
