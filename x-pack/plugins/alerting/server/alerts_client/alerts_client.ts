/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_RULE_UUID, ALERT_UUID } from '@kbn/rule-data-utils';
import { chunk, flatMap, isEmpty, keys } from 'lodash';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { DeepPartial } from '@kbn/utility-types';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAlertData,
  WithoutReservedActionGroups,
} from '../types';
import { LegacyAlertsClient } from './legacy_alerts_client';
import {
  getIndexTemplateAndPattern,
  IIndexPatternString,
} from '../alerts_service/resource_installer_utils';
import { CreateAlertsClientParams } from '../alerts_service/alerts_service';
import {
  type AlertRule,
  IAlertsClient,
  InitializeExecutionOpts,
  ProcessAndLogAlertsOpts,
  TrackedAlerts,
  ReportedAlert,
  ReportedAlertData,
  UpdateableAlert,
} from './types';
import {
  buildNewAlert,
  buildOngoingAlert,
  buildUpdatedRecoveredAlert,
  buildRecoveredAlert,
  formatRule,
} from './lib';

// Term queries can take up to 10,000 terms
const CHUNK_SIZE = 10000;

export interface AlertsClientParams extends CreateAlertsClientParams {
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  kibanaVersion: string;
}

export class AlertsClient<
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> implements
    IAlertsClient<AlertData, LegacyState, LegacyContext, ActionGroupIds, RecoveryActionGroupId>
{
  private legacyAlertsClient: LegacyAlertsClient<
    LegacyState,
    LegacyContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >;

  // Query for alerts from the previous execution in order to identify the
  // correct index to use if and when we need to make updates to existing active or
  // recovered alerts
  private fetchedAlerts: {
    indices: Record<string, string>;
    data: Record<string, Alert & AlertData>;
  };

  private rule: AlertRule = {};

  private indexTemplateAndPattern: IIndexPatternString;

  private reportedAlerts: Record<string, DeepPartial<AlertData>> = {};

  constructor(private readonly options: AlertsClientParams) {
    this.legacyAlertsClient = new LegacyAlertsClient<
      LegacyState,
      LegacyContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >({ logger: this.options.logger, ruleType: this.options.ruleType });
    this.indexTemplateAndPattern = getIndexTemplateAndPattern({
      context: this.options.ruleType.alerts?.context!,
      namespace: this.options.ruleType.alerts?.isSpaceAware
        ? this.options.namespace
        : DEFAULT_NAMESPACE_STRING,
    });
    this.fetchedAlerts = { indices: {}, data: {} };
    this.rule = formatRule({ rule: this.options.rule, ruleType: this.options.ruleType });
  }

  public async initializeExecution(opts: InitializeExecutionOpts) {
    await this.legacyAlertsClient.initializeExecution(opts);

    // Get tracked alert UUIDs to query for
    // TODO - we can consider refactoring to store the previous execution UUID and query
    // for active and recovered alerts from the previous execution using that UUID
    const trackedAlerts = this.legacyAlertsClient.getTrackedAlerts();

    const uuidsToFetch: string[] = [];
    keys(trackedAlerts).forEach((key) => {
      const tkey = key as keyof TrackedAlerts<LegacyState, LegacyContext>;
      keys(trackedAlerts[tkey]).forEach((alertId: string) => {
        uuidsToFetch.push(trackedAlerts[tkey][alertId].getUuid());
      });
    });

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
      this.options.logger.error(`Error searching for tracked alerts by UUID - ${err.message}`);
    }
  }

  public async search(queryBody: SearchRequest['body']) {
    const esClient = await this.options.elasticsearchClientPromise;

    const {
      hits: { hits },
    } = await esClient.search<Alert & AlertData>({
      index: this.indexTemplateAndPattern.pattern,
      body: queryBody,
    });

    return hits;
  }

  public report(
    alert: ReportedAlert<
      AlertData,
      LegacyState,
      LegacyContext,
      WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
    >
  ): ReportedAlertData {
    const context = alert.context ? alert.context : ({} as LegacyContext);
    const state = !isEmpty(alert.state) ? alert.state : null;

    // Create a legacy alert
    const legacyAlert = this.legacyAlertsClient
      .factory()
      .create(alert.id)
      .scheduleActions(alert.actionGroup, context);

    if (state) {
      legacyAlert.replaceState(state);
    }

    // Save the alert payload
    if (alert.payload) {
      this.reportedAlerts[alert.id] = alert.payload;
    }

    return {
      uuid: legacyAlert.getUuid(),
      start: legacyAlert.getStart(),
    };
  }

  public setAlertData(
    alert: UpdateableAlert<AlertData, LegacyState, LegacyContext, ActionGroupIds>
  ) {
    const context = alert.context ? alert.context : ({} as LegacyContext);

    // Allow setting context and payload on known alerts only
    // Alerts are known if they have been reported in this execution or are recovered
    const alertToUpdate = this.legacyAlertsClient.getAlert(alert.id);

    if (!alertToUpdate) {
      throw new Error(
        `Cannot set alert data for alert ${alert.id} because it has not been reported and it is not recovered.`
      );
    }

    // Set the alert context
    alertToUpdate.setContext(context);

    // Save the alert payload
    if (alert.payload) {
      this.reportedAlerts[alert.id] = alert.payload;
    }
  }

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

  public async persistAlerts() {
    const currentTime = new Date().toISOString();
    const esClient = await this.options.elasticsearchClientPromise;

    const { alertsToReturn, recoveredAlertsToReturn } =
      this.legacyAlertsClient.getAlertsToSerialize(false);

    const activeAlerts = this.legacyAlertsClient.getProcessedAlerts('activeCurrent');
    const recoveredAlerts = this.legacyAlertsClient.getProcessedAlerts('recoveredCurrent');

    // TODO - Lifecycle alerts set some other fields based on alert status
    // Example: workflow status - default to 'open' if not set
    // event action: new alert = 'new', active alert: 'active', otherwise 'close'

    const activeAlertsToIndex: Array<Alert & AlertData> = [];
    for (const id of keys(alertsToReturn)) {
      // See if there's an existing active alert document
      if (
        this.fetchedAlerts.data.hasOwnProperty(id) &&
        this.fetchedAlerts.data[id].kibana.alert.status === 'active'
      ) {
        activeAlertsToIndex.push(
          buildOngoingAlert<
            AlertData,
            LegacyState,
            LegacyContext,
            ActionGroupIds,
            RecoveryActionGroupId
          >({
            alert: this.fetchedAlerts.data[id],
            legacyAlert: activeAlerts[id],
            rule: this.rule,
            timestamp: currentTime,
            payload: this.reportedAlerts[id],
            kibanaVersion: this.options.kibanaVersion,
          })
        );
      } else {
        activeAlertsToIndex.push(
          buildNewAlert<
            AlertData,
            LegacyState,
            LegacyContext,
            ActionGroupIds,
            RecoveryActionGroupId
          >({
            legacyAlert: activeAlerts[id],
            rule: this.rule,
            timestamp: currentTime,
            payload: this.reportedAlerts[id],
            kibanaVersion: this.options.kibanaVersion,
          })
        );
      }
    }

    const recoveredAlertsToIndex: Array<Alert & AlertData> = [];
    for (const id of keys(recoveredAlertsToReturn)) {
      // See if there's an existing alert document
      // If there is not, log an error because there should be
      if (this.fetchedAlerts.data.hasOwnProperty(id)) {
        recoveredAlertsToIndex.push(
          recoveredAlerts[id]
            ? buildRecoveredAlert<
                AlertData,
                LegacyState,
                LegacyContext,
                ActionGroupIds,
                RecoveryActionGroupId
              >({
                alert: this.fetchedAlerts.data[id],
                legacyAlert: recoveredAlerts[id],
                rule: this.rule,
                timestamp: currentTime,
                payload: this.reportedAlerts[id],
                recoveryActionGroup: this.options.ruleType.recoveryActionGroup.id,
                kibanaVersion: this.options.kibanaVersion,
              })
            : buildUpdatedRecoveredAlert<AlertData>({
                alert: this.fetchedAlerts.data[id],
                legacyRawAlert: recoveredAlertsToReturn[id],
                timestamp: currentTime,
                rule: this.rule,
              })
        );
      } else {
        this.options.logger.warn(
          `Could not find alert document to update for recovered alert with id ${id} and uuid ${recoveredAlerts[
            id
          ].getUuid()}`
        );
      }
    }

    const alertsToIndex = [...activeAlertsToIndex, ...recoveredAlertsToIndex];
    if (alertsToIndex.length > 0) {
      try {
        const response = await esClient.bulk({
          refresh: 'wait_for',
          index: this.indexTemplateAndPattern.alias,
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

        // If there were individual indexing errors, they will be returned in the success response
        if (response && response.errors) {
          const errorsInResponse = (response.items ?? [])
            .map((item) => (item && item.index && item.index.error ? item.index.error : null))
            .filter((item) => item != null);

          this.options.logger.error(
            `Error writing ${errorsInResponse.length} out of ${
              alertsToIndex.length
            } alerts - ${JSON.stringify(errorsInResponse)}`
          );
        }
      } catch (err) {
        this.options.logger.error(
          `Error writing ${alertsToIndex.length} alerts to ${this.indexTemplateAndPattern.alias} - ${err.message}`
        );
      }
    }
  }

  public getAlertsToSerialize() {
    // The flapping value that is persisted inside the task manager state (and used in the next execution)
    // is different than the value that should be written to the alert document. For this reason, we call
    // getAlertsToSerialize() twice, once before building and bulk indexing alert docs and once after to return
    // the value for task state serialization

    // This will be a blocker if ever we want to stop serializing alert data inside the task state and just use
    // the fetched alert document.
    return this.legacyAlertsClient.getAlertsToSerialize();
  }

  public factory() {
    return this.legacyAlertsClient.factory();
  }

  public client() {
    return {
      report: (
        alert: ReportedAlert<
          AlertData,
          LegacyState,
          LegacyContext,
          WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
        >
      ) => this.report(alert),
      setAlertData: (
        alert: UpdateableAlert<AlertData, LegacyState, LegacyContext, RecoveryActionGroupId>
      ) => this.setAlertData(alert),
      getAlertLimitValue: (): number => this.factory().alertLimit.getValue(),
      setAlertLimitReached: (reached: boolean) =>
        this.factory().alertLimit.setLimitReached(reached),
      getRecoveredAlerts: () => {
        const { getRecoveredAlerts } = this.factory().done();
        const recoveredLegacyAlerts = getRecoveredAlerts() ?? [];
        return recoveredLegacyAlerts.map((alert) => ({
          alert,
          hit: this.fetchedAlerts.data[alert.getId()],
        }));
      },
    };
  }
}
