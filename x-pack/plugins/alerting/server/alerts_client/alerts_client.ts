/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_RULE_UUID, ALERT_UUID } from '@kbn/rule-data-utils';
import { chunk, compact, flatMap, keys, merge } from 'lodash';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RawAlertInstance,
  RuleAlertData,
  RulesSettingsFlappingProperties,
} from '../types';
import { LegacyAlertsClient } from './legacy_alerts_client';
import { getIndexTemplateAndPattern } from '../alerts_service/resource_installer_utils';
import { CreateAlertsClientParams } from '../alerts_service/alerts_service';
import { IAlertsClient, InitializeExecutionOpts, ProcessAndLogAlertsOpts } from './types';

// Term queries can take up to 10,000 terms
const CHUNK_SIZE = 10000;

// export type ReportedAlert = Pick<Alert, typeof ALERT_ACTION_GROUP | typeof ALERT_ID> &
//   Partial<Omit<Alert, typeof ALERT_ACTION_GROUP | typeof ALERT_ID>>;

export interface AlertsClientParams extends CreateAlertsClientParams {
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
}

export interface AADRuleData {
  consumer: string;
  executionId: string;
  id: string;
  name: string;
  tags: string[];
  spaceId: string;
  parameters: unknown;
}
export class AlertsClient<
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> implements IAlertsClient<LegacyState, LegacyContext, ActionGroupIds, RecoveryActionGroupId>
{
  private legacyAlertsClient: LegacyAlertsClient<
    LegacyState,
    LegacyContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
  // private rule: AlertRuleSchema | null = null;
  // private reportedAlerts: Record<string, ReportedAlert & AlertData> = {};
  private fetchedAlerts: {
    indices: Record<string, string>;
    data: Record<string, Alert & AlertData>;
  };

  constructor(private readonly options: AlertsClientParams) {
    this.legacyAlertsClient = new LegacyAlertsClient<
      LegacyState,
      LegacyContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >({ logger: this.options.logger, ruleType: this.options.ruleType });
    this.fetchedAlerts = { indices: {}, data: {} };
  }

  public async initializeExecution(opts: InitializeExecutionOpts) {
    await this.legacyAlertsClient.initializeExecution(opts);

    // Get tracked alert UUIDs to query for
    // TODO - we can consider refactoring to store the previous execution UUID and query
    // for active and recovered alerts from the previous execution using that UUID
    const trackedAlerts = this.legacyAlertsClient.getTrackedAlerts();

    const uuidsToFetch: string[] = compact(
      keys(trackedAlerts.active).map((activeAlertId: string) =>
        trackedAlerts.active[activeAlertId].getUuid()
      )
    );

    if (!uuidsToFetch.length) {
      return;
    }

    const queryByUuid = async (uuids: string[]) => {
      return await this.search({
        size: uuids.length,
        query: {
          bool: {
            filter: [
              {
                term: {
                  [ALERT_RULE_UUID]: this.options.rule.id,
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
      });
    };

    try {
      const results = await Promise.all(
        chunk(uuidsToFetch, CHUNK_SIZE).map((uuidChunk: string[]) => queryByUuid(uuidChunk))
      );

      for (const hit of results.flat()) {
        const alertHit: Alert & AlertData = hit._source as Alert & AlertData;
        const alertUuid = alertHit.kibana.alert.uuid;
        const alertId = alertHit.kibana.alert.instance.id;

        // Keep track of existing alert document so we can copy over data if alert is ongoing
        this.fetchedAlerts.data[alertId] = alertHit;

        // Keep track of index so we can update the correct document
        this.fetchedAlerts.indices[alertUuid] = hit._index;
      }
    } catch (err) {
      this.options.logger.error(`Error searching for active alerts by UUID - ${err.message}`);
    }
  }

  public async search(queryBody: SearchRequest['body']) {
    const context = this.options.ruleType.alerts?.context;
    const esClient = await this.options.elasticsearchClientPromise;

    const indexTemplateAndPattern = getIndexTemplateAndPattern({
      context: context!,
      namespace: this.options.namespace,
    });

    const {
      hits: { hits },
    } = await esClient.search<Alert & AlertData>({
      index: indexTemplateAndPattern.pattern, // also do legacy indices
      body: queryBody,
    });

    return hits;
  }

  // public create(alert: ReportedAlert & AlertData) {
  //   const alertId = alert[ALERT_ID];

  //   // TODO - calculate context & state from reported alert

  //   // Create a legacy alert using the AlertsFactory interface
  //   this.alertsFactory
  //     .create(alert[ALERT_ID])
  //     .scheduleActions(
  //       alert[ALERT_ACTION_GROUP] as WithoutReservedActionGroups<
  //         ActionGroupIds,
  //         RecoveryActionGroupId
  //       >
  //     );

  //   // Save the reported alert data
  //   this.reportedAlerts[alertId] = alert;
  // }

  public hasReachedAlertLimit(): boolean {
    return this.legacyAlertsClient.hasReachedAlertLimit();
  }

  public checkLimitUsage() {
    return this.legacyAlertsClient.checkLimitUsage();
  }

  public processAndLogAlerts(opts: ProcessAndLogAlertsOpts) {
    this.legacyAlertsClient.processAndLogAlerts(opts);
  }

  public getProcessedAlerts(
    type: 'new' | 'active' | 'activeCurrent' | 'recovered' | 'recoveredCurrent'
  ) {
    return this.legacyAlertsClient.getProcessedAlerts(type);
  }

  public async getAlertsToSerialize() {
    const currentTime = new Date().toISOString();

    const { alertsToReturn, recoveredAlertsToReturn } =
      await this.legacyAlertsClient.getAlertsToSerialize();

    const context = this.options.ruleType.alerts?.context;
    const esClient = await this.options.elasticsearchClientPromise;

    const indexTemplateAndPattern = getIndexTemplateAndPattern({
      context: context!,
      namespace: this.options.namespace,
    });

    // TODO - Lifecycle alerts set some other fields based on alert status
    // Example: workflow status - default to 'open' if not set
    // event action: new alert = 'new', active alert: 'active', otherwise 'close'

    const activeAlertsToIndex: Array<Alert & AlertData> = [];
    for (const id of keys(alertsToReturn)) {
      activeAlertsToIndex.push(this.formatAlert(id, alertsToReturn[id], 'active', currentTime));
    }

    const recoveredAlertsToIndex: Array<Alert & AlertData> = [];
    for (const id of keys(recoveredAlertsToReturn)) {
      recoveredAlertsToIndex.push(
        this.formatAlert(id, recoveredAlertsToReturn[id], 'recovered', currentTime)
      );
    }

    await esClient.bulk({
      refresh: 'wait_for',
      index: indexTemplateAndPattern.alias,
      require_alias: true,
      body: flatMap(
        [...activeAlertsToIndex, ...recoveredAlertsToIndex].map((alert: Alert & AlertData) => [
          {
            index: {
              _id: alert.kibana.alert.uuid,
              // If we know the concrete index for this alert, specify it
              ...(this.fetchedAlerts.indices[alert.kibana.alert.uuid]
                ? {
                    _index: this.fetchedAlerts.indices[alert.kibana.alert.uuid],
                    require_alias: false,
                  }
                : {}),
            },
          },
          alert,
        ])
      ),
    });

    return { alertsToReturn, recoveredAlertsToReturn };
  }

  public getExecutorServices() {
    return this.legacyAlertsClient.getExecutorServices();
  }

  public setFlapping(flappingSettings: RulesSettingsFlappingProperties) {
    return this.legacyAlertsClient.setFlapping(flappingSettings);
  }

  private formatRule(rule: AADRuleData) {
    return {
      kibana: {
        alert: {
          rule: {
            category: this.options.ruleType.name,
            consumer: rule.consumer,
            execution: {
              uuid: rule.executionId,
            },
            name: rule.name,
            parameters: rule.parameters,
            producer: this.options.ruleType.producer,
            revision: 0,
            rule_type_id: this.options.ruleType.id,
            tags: rule.tags,
            uuid: rule.id,
          },
        },
        space_ids: [rule.spaceId],
      },
    };
  }

  private formatAlert(
    id: string,
    legacyAlert: RawAlertInstance,
    status: string,
    currentTime: string
  ): Alert & AlertData {
    return merge(
      {
        '@timestamp': currentTime,
        kibana: {
          alert: {
            ...(legacyAlert.state?.duration
              ? { duration: { us: legacyAlert.state?.duration } }
              : {}),
            ...(legacyAlert.state?.end ? { end: legacyAlert.state?.end } : {}),
            flapping: legacyAlert.meta?.flapping,
            flapping_history: legacyAlert.meta?.flappingHistory,
            instance: {
              id,
            },
            ...(legacyAlert.state?.start ? { start: legacyAlert.state?.start } : {}),
            status,
            uuid: legacyAlert.meta?.uuid!,
          },
        },
      },
      this.formatRule(this.options.rule)
    ) as Alert & AlertData;

    // {
    //   // Copy current rule data, including current execution UUID
    //   ...ruleData,
    //   [ALERT_INSTANCE_ID]: id,

    //   // Copy data from LegacyAlert meta and state
    //   [ALERT_UUID]: alertsToReturn[id].meta?.uuid!,
    //   ...(alertsToReturn[id].state?.start
    //     ? { [ALERT_START]: alertsToReturn[id].state?.start! }
    //     : {}),
    //   ...(alertsToReturn[id].state?.duration
    //     ? { [ALERT_DURATION]: alertsToReturn[id].state?.duration! }
    //     : {}),
    //   [ALERT_FLAPPING]: alertsToReturn[id].meta?.flapping,
    //   [ALERT_FLAPPING_HISTORY]: alertsToReturn[id].meta?.flappingHistory,

    //   [ALERT_STATUS]: 'active',
    //   [TIMESTAMP]: currentTime, // TODO - should this be task.startedAt?
    // }
  }
}
