/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, ElasticsearchClient } from '@kbn/core/server';
import {
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_END,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_ID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_UUID,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { keys } from 'lodash';
import { Alert } from '../../common/alert_schema/schemas/alert_schema';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { PublicAlertFactory } from '../alert/create_alert_factory';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAlertData,
  WithoutReservedActionGroups,
} from '../types';
import { IAlertsClient, LegacyAlertsClient, ProcessAndLogAlertsOpts } from './legacy_alerts_client';
import { Alert as LegacyAlert } from '../alert/alert';

export type ReportedAlert = Pick<Alert, typeof ALERT_ACTION_GROUP | typeof ALERT_ID> &
  Partial<Omit<Alert, typeof ALERT_ACTION_GROUP | typeof ALERT_ID>>;

export interface AlertsClientParams<
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  ruleType: UntypedNormalizedRuleType;
  maxAlerts: number;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  eventLogger: AlertingEventLogger;
  legacyAlertsClient: LegacyAlertsClient<
    LegacyState,
    LegacyContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
}

// todo would be nice to infer this from AlertSchema
export interface AlertRuleSchema {
  [ALERT_RULE_CATEGORY]: string;
  [ALERT_RULE_CONSUMER]: string;
  [ALERT_RULE_EXECUTION_UUID]: string;
  [ALERT_RULE_NAME]: string;
  [ALERT_RULE_PRODUCER]: string;
  [ALERT_RULE_TAGS]: string[];
  [ALERT_RULE_TYPE_ID]: string;
  [ALERT_RULE_UUID]: string;
  [ALERT_RULE_PARAMETERS]: unknown;
  [SPACE_IDS]: string[];
}

interface InitializeOpts {
  rule: {
    consumer: string;
    executionId: string;
    id: string;
    name: string;
    tags: string[];
    spaceId: string;
    parameters: unknown;
  };
}

export type PublicAlertsClient<
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> = Pick<
  AlertsClient<AlertData, LegacyState, LegacyContext, ActionGroupIds, RecoveryActionGroupId>,
  'create'
> & {
  getAlertLimitValue: () => number;
  setAlertLimitReached: (reached: boolean) => void;
  getRecoveredAlerts: () => Array<LegacyAlert<LegacyState, LegacyContext, ActionGroupIds>>;
};

export class AlertsClient<
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> implements IAlertsClient<LegacyState, LegacyContext, ActionGroupIds, RecoveryActionGroupId>
{
  private rule: AlertRuleSchema | null = null;
  private ruleLogPrefix: string;
  private alertsFactory: PublicAlertFactory<
    LegacyState,
    LegacyContext,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  >;
  private reportedAlerts: Record<string, ReportedAlert & AlertData> = {};

  constructor(
    private readonly options: AlertsClientParams<
      LegacyState,
      LegacyContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >
  ) {
    this.ruleLogPrefix = `${this.options.ruleType.id}`;
    this.alertsFactory = this.options.legacyAlertsClient.getExecutorServices();
  }

  public async initialize({ rule }: InitializeOpts) {
    this.setRuleData(rule);
  }

  public create(alert: ReportedAlert & AlertData) {
    const alertId = alert[ALERT_ID];
    this.alertsFactory
      .create(alert[ALERT_ID])
      .scheduleActions(
        alert[ALERT_ACTION_GROUP] as WithoutReservedActionGroups<
          ActionGroupIds,
          RecoveryActionGroupId
        >
      );

    this.reportedAlerts[alertId] = alert;
  }

  public hasReachedAlertLimit(): boolean {
    return this.options.legacyAlertsClient.hasReachedAlertLimit();
  }

  public checkLimitUsage() {
    return this.options.legacyAlertsClient.checkLimitUsage();
  }

  public processAndLogAlerts(opts: ProcessAndLogAlertsOpts) {
    this.options.legacyAlertsClient.processAndLogAlerts(opts);
  }

  public getProcessedAlerts(type: 'new' | 'active' | 'recovered' | 'recoveredCurrent') {
    return this.options.legacyAlertsClient.getProcessedAlerts(type);
  }

  public async getAlertsToSerialize() {
    const currentTime = new Date().toISOString();

    const { alertsToReturn, recoveredAlertsToReturn } =
      await this.options.legacyAlertsClient.getAlertsToSerialize();

    const esClient = await this.options.elasticsearchClientPromise;

    // TODO - Lifecycle alerts set some other fields based on alert status
    // Example: workflow status - default to 'open' if not set
    // event action: new alert = 'new', active alert: 'active', otherwise 'close'

    const activeAlertsToIndex: Alert[] = [];
    for (const id of keys(alertsToReturn)) {
      activeAlertsToIndex.push({
        ...this.rule,
        [ALERT_ACTION_GROUP]: alertsToReturn[id].meta?.lastScheduledActions?.group!,
        [ALERT_ID]: id,
        [ALERT_UUID]: alertsToReturn[id].meta?.uuid!,
        [ALERT_STATUS]: 'active',
        ...(alertsToReturn[id].state?.start
          ? { [ALERT_START]: alertsToReturn[id].state?.start! }
          : {}),
        ...(alertsToReturn[id].state?.duration
          ? { [ALERT_DURATION]: alertsToReturn[id].state?.duration! }
          : {}),
        [ALERT_FLAPPING]: alertsToReturn[id].meta?.flapping,
        [ALERT_FLAPPING_HISTORY]: alertsToReturn[id].meta?.flappingHistory,
        [TIMESTAMP]: currentTime, // TODO - should this be task.startedAt?
      } as Alert);
    }

    const recoveredAlertsToIndex: Alert[] = [];
    for (const id of keys(recoveredAlertsToReturn)) {
      recoveredAlertsToIndex.push({
        ...this.rule,
        [ALERT_ACTION_GROUP]: recoveredAlertsToReturn[id].meta?.lastScheduledActions?.group!,
        [ALERT_ID]: id,
        [ALERT_UUID]: recoveredAlertsToReturn[id].meta?.uuid!,
        [ALERT_STATUS]: 'active',
        ...(recoveredAlertsToReturn[id].state?.start
          ? { [ALERT_START]: recoveredAlertsToReturn[id].state?.start! }
          : {}),
        ...(recoveredAlertsToReturn[id].state?.duration
          ? { [ALERT_DURATION]: recoveredAlertsToReturn[id].state?.duration! }
          : {}),
        ...(recoveredAlertsToReturn[id].state?.end
          ? { [ALERT_END]: recoveredAlertsToReturn[id].state?.end! }
          : {}),
        [ALERT_FLAPPING]: recoveredAlertsToReturn[id].meta?.flapping,
        [ALERT_FLAPPING_HISTORY]: recoveredAlertsToReturn[id].meta?.flappingHistory,
        [TIMESTAMP]: currentTime, // TODO - should this be task.startedAt?
      } as Alert);
    }

    console.log(
      `alerts to write ${JSON.stringify([...activeAlertsToIndex, ...recoveredAlertsToIndex])}`
    );

    // await esClient.bulk({
    //   refresh: 'wait_for',
    //   body: [...activeAlertsToIndex, ...recoveredAlertsToIndex].map((alert) => [
    //     {
    //       index: {
    //         _id: alert[ALERT_UUID],
    //         // If we know the concrete index for this alert, specify it
    //         ...(this.trackedAlertIndices[alert[ALERT_UUID]]
    //           ? { _index: this.trackedAlertIndices[alert[ALERT_UUID]], require_alias: false }
    //           : {}),
    //       },
    //     },
    //     alert,
    //   ]),
    // });

    return { alertsToReturn, recoveredAlertsToReturn };
  }

  public getExecutorServices(): PublicAlertsClient<
    AlertData,
    LegacyState,
    LegacyContext,
    ActionGroupIds,
    RecoveryActionGroupId
  > {
    return {
      create: (...args) => this.create(...args),
      getAlertLimitValue: () => this.alertsFactory.alertLimit.getValue(),
      setAlertLimitReached: (...args) => this.alertsFactory.alertLimit.setLimitReached(...args),
      getRecoveredAlerts: () => {
        const { getRecoveredAlerts } = this.alertsFactory.done();
        return getRecoveredAlerts();
      },
    };
  }

  private setRuleData(rule: {
    consumer: string;
    executionId: string;
    id: string;
    name: string;
    tags: string[];
    spaceId: string;
    parameters: unknown;
  }) {
    this.rule = {
      [ALERT_RULE_CATEGORY]: this.options.ruleType.name,
      [ALERT_RULE_CONSUMER]: rule.consumer,
      [ALERT_RULE_EXECUTION_UUID]: rule.executionId,
      [ALERT_RULE_NAME]: rule.name,
      [ALERT_RULE_PRODUCER]: this.options.ruleType.producer,
      [ALERT_RULE_TAGS]: rule.tags,
      [ALERT_RULE_TYPE_ID]: this.options.ruleType.id,
      [ALERT_RULE_UUID]: rule.id,
      [ALERT_RULE_PARAMETERS]: rule.parameters,
      [SPACE_IDS]: [rule.spaceId],
    };
    this.ruleLogPrefix = `${this.options.ruleType.id}:${rule.id}: '${rule.name}'`;
  }
}
