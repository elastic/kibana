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
  ALERT_UUID,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { chunk, compact, flatMap, keys } from 'lodash';
import { type Alert } from '../../common/alert_schema/schemas/alert_schema';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { PublicAlertFactory } from '../alert/create_alert_factory';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAlertData,
  WithoutReservedActionGroups,
} from '../types';
import { IAlertsClient, LegacyAlertsClient, ProcessAndLogAlertsOpts } from './legacy_alerts_client';
import { Alert as LegacyAlert } from '../alert/alert';
import { getIndexTemplateAndPattern } from '../alerts_service/types';

// Term queries can take up to 10,000 terms
const CHUNK_SIZE = 10000;

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
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
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

export interface IAlertsAsDataClient<AlertData extends RuleAlertData = never> {
  create(alert: ReportedAlert & AlertData): void;
}

export type PublicAlertsClient<
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string
> = Pick<IAlertsAsDataClient<AlertData>, 'create'> & {
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
> implements
    IAlertsAsDataClient<AlertData>,
    IAlertsClient<LegacyState, LegacyContext, ActionGroupIds, RecoveryActionGroupId>
{
  private rule: AlertRuleSchema | null = null;
  private alertsFactory: PublicAlertFactory<
    LegacyState,
    LegacyContext,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  >;
  private reportedAlerts: Record<string, ReportedAlert & AlertData> = {};
  private fetchedAlerts: {
    indices: Record<string, string>;
    data: Record<string, Alert & AlertData>;
  };

  constructor(
    private readonly options: AlertsClientParams<
      LegacyState,
      LegacyContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >
  ) {
    this.fetchedAlerts = { indices: {}, data: {} };
    this.alertsFactory = this.options.legacyAlertsClient.getExecutorServices();
  }

  public async initialize({ rule }: InitializeOpts) {
    this.setRuleData(rule);

    const context = this.options.ruleType.alerts?.context;
    const esClient = await this.options.elasticsearchClientPromise;

    const indexTemplateAndPattern = getIndexTemplateAndPattern(context!);

    // Get tracked alert UUIDs to query for
    const trackedAlerts = this.options.legacyAlertsClient.getTrackedAlerts();
    const uuidsToFetch: string[] = compact(
      keys(trackedAlerts.active).map((activeAlertId: string) =>
        trackedAlerts.active[activeAlertId].getUuid()
      )
    );

    if (!uuidsToFetch.length) {
      return;
    }

    const queryByUuid = async (uuids: string[]) => {
      const {
        hits: { hits },
      } = await esClient.search<Alert & AlertData>({
        index: indexTemplateAndPattern.pattern, // also do legacy indices
        body: {
          size: uuids.length,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    [ALERT_RULE_UUID]: rule.id,
                  },
                },
                {
                  terms: {
                    [ALERT_UUID]: uuids,
                  },
                },
              ],
            },
          },
        },
      });
      return hits;
    };

    try {
      const results = await Promise.all(
        chunk(uuidsToFetch, CHUNK_SIZE).map((uuidChunk: string[]) => queryByUuid(uuidChunk))
      );

      for (const hit of results.flat()) {
        const alertHit: Alert & AlertData = hit._source as Alert & AlertData;
        const alertUuid = alertHit[ALERT_UUID];
        // TODO - in legacy indices, ALERT_ID is stored in ALERT_INSTANCE_ID
        const alertId = alertHit[ALERT_ID];

        // Keep track of existing alert document so we can copy over data if alert is ongoing
        this.fetchedAlerts.data[alertId] = alertHit;

        // Keep track of index so we can update the correct document
        this.fetchedAlerts.indices[alertUuid] = hit._index;
      }
    } catch (err) {
      this.options.logger.error(`Error searching for active alerts by UUID - ${err.message}`);
    }
  }

  public create(alert: ReportedAlert & AlertData) {
    const alertId = alert[ALERT_ID];

    // TODO - calculate context & state from reported alert

    // Create a legacy alert using the AlertsFactory interface
    this.alertsFactory
      .create(alert[ALERT_ID])
      .scheduleActions(
        alert[ALERT_ACTION_GROUP] as WithoutReservedActionGroups<
          ActionGroupIds,
          RecoveryActionGroupId
        >
      );

    // Save the reported alert data
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

    const context = this.options.ruleType.alerts?.context;
    const esClient = await this.options.elasticsearchClientPromise;

    const indexTemplateAndPattern = getIndexTemplateAndPattern(context!);

    // TODO - Lifecycle alerts set some other fields based on alert status
    // Example: workflow status - default to 'open' if not set
    // event action: new alert = 'new', active alert: 'active', otherwise 'close'

    const activeAlertsToIndex: Alert[] = [];
    for (const id of keys(alertsToReturn)) {
      activeAlertsToIndex.push({
        // Copy current rule data, including current execution UUID
        ...this.rule,

        // Copy data from reported alert
        ...(this.reportedAlerts[id] ? { ...this.reportedAlerts[id] } : {}),
        [ALERT_ID]: id,

        // Copy data from LegacyAlert meta and state
        [ALERT_UUID]: alertsToReturn[id].meta?.uuid!,
        ...(alertsToReturn[id].state?.start
          ? { [ALERT_START]: alertsToReturn[id].state?.start! }
          : {}),
        ...(alertsToReturn[id].state?.duration
          ? { [ALERT_DURATION]: alertsToReturn[id].state?.duration! }
          : {}),
        [ALERT_FLAPPING]: alertsToReturn[id].meta?.flapping,
        [ALERT_FLAPPING_HISTORY]: alertsToReturn[id].meta?.flappingHistory,

        [ALERT_STATUS]: 'active',
        [TIMESTAMP]: currentTime, // TODO - should this be task.startedAt?
      } as Alert);
    }

    const recoveredAlertsToIndex: Alert[] = [];
    for (const id of keys(recoveredAlertsToReturn)) {
      recoveredAlertsToIndex.push({
        // Copy current rule data, including current execution UUID
        ...this.rule,
        [ALERT_ID]: id,

        // Copy data from LegacyAlert meta and state
        [ALERT_UUID]: recoveredAlertsToReturn[id].meta?.uuid!,
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

        [ALERT_STATUS]: 'recovered',
        [TIMESTAMP]: currentTime, // TODO - should this be task.startedAt?
      } as Alert);
    }

    await esClient.bulk({
      refresh: 'wait_for',
      index: indexTemplateAndPattern.alias,
      require_alias: true,
      body: flatMap(
        [...activeAlertsToIndex, ...recoveredAlertsToIndex].map((alert) => [
          {
            index: {
              _id: alert[ALERT_UUID],
              // If we know the concrete index for this alert, specify it
              ...(this.fetchedAlerts.indices[alert[ALERT_UUID]]
                ? { _index: this.fetchedAlerts.indices[alert[ALERT_UUID]], require_alias: false }
                : {}),
            },
          },
          alert,
        ])
      ),
    });

    return { alertsToReturn, recoveredAlertsToReturn };
  }

  public getExecutorServices(): PublicAlertsClient<
    AlertData,
    LegacyState,
    LegacyContext,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
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
  }
}
