/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import * as rt from 'io-ts';
import { isEmpty, mapValues } from 'lodash';
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
import { SearchHit, SearchTotalHits } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { LastScheduledActions, type Alert } from '../../common';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { getIndexTemplateAndPattern } from '../alerts_service/types';
import { AlertLimitService, IAlertLimitService } from './alert_limit_service';
import { ReportedAlert } from './types';
import { determineAlertsToPersist, isFlapping, processAlerts } from '../lib';
import { logAlerts } from '../task_runner/log_alerts';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';

const contextSchema = rt.record(rt.string, rt.unknown);
export type ContextAlert = rt.TypeOf<typeof contextSchema>;

const QUERY_SIZE = 1000;

export interface IAlertsClient<Context> {
  /**
   * Initialize the client with alerts that were created or updated
   * during the previous execution.
   */
  initialize(opts: InitializeOpts): Promise<void>;

  /**
   * Returns whether the alert limit has been hit
   */
  hasReachedAlertLimit(): void;
  checkLimitUsage(): void;

  /**
   * Creates new alert document
   */
  create(alert: ReportedAlert & Context): void;

  processAndLogAlerts(ruleRunMetricsStore: RuleRunMetricsStore, shouldLogAlerts: boolean): void;

  /**
   * Returns list of recovered alert IDs, as determined by framework
   */
  getRecoveredAlertIds(): string[];
  //   /**
  //    * Partially update an alert document
  //    * - Can use this for recovery alerts
  //    * - Control which fields can be updated?
  //    */
  //   update(id: string, updatedAlert: Partial<Context>): void;
  //   // /**
  //   //  * Triggers auto-recovery detection unless rule type has opted out
  //   //  * Writes all alerts to default index.
  //   //  * Handles logging to event log as well
  //   //  */
  //   // writeAlerts(params?: WriteAlertParams): void;
  //   // /**
  //   //  * This might not belong on the AlertsClient but putting it here for now
  //   //  */
  //   // scheduleActions(params: ScheduleActionsParams): void;
  /**
   * Returns subset of functions available to rule executors
   * Don't expose any functions with direct read or write access to the alerts index
   */
  getExecutorServices(): PublicAlertsClient<Context>;
}

export type PublicAlertsClient<Context> = Pick<
  IAlertsClient<Context>,
  'create' | 'getRecoveredAlertIds'
> &
  Pick<IAlertLimitService, 'getAlertLimitValue' | 'setAlertLimitReached'>;

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
  [SPACE_IDS]: string[];
}

export interface AlertsClientParams {
  logger: Logger;
  ruleType: UntypedNormalizedRuleType;
  maxAlerts: number;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  resourceInstallationPromise: Promise<boolean>;
  eventLogger: AlertingEventLogger;
}

interface InitializeOpts {
  rule: {
    consumer: string;
    executionId: string;
    id: string;
    name: string;
    tags: string[];
    spaceId: string;
  };
  previousRuleExecutionUuid?: string;
}

export class AlertsClient<Context extends ContextAlert> implements IAlertsClient<Context> {
  private alertLimitServices: AlertLimitService;
  private rule: AlertRuleSchema | null = null;
  private ruleLogPrefix: string;

  private hasCalledGetRecoveredAlerts: boolean = false;

  // Alerts that were reported as active or recovered in the previous rule execution
  private trackedAlerts: {
    active: Record<string, Alert & Context>;
    recovered: Record<string, Alert & Context>;
  } = {
    active: {},
    recovered: {},
  };

  // Keep track of the concrete indices for tracked alerts by alert UUID
  // so if we update those alerts we target the correct index
  private trackedAlertIndices: Record<string, string> = {};

  // Alerts reported by rule executor during the current rule execution
  private numAlertsReported: number = 0;
  private reportedAlerts: Record<string, Alert & Context> = {};

  private processedAlerts: {
    new: Record<string, Alert & Context>;
    active: Record<string, Alert & Context>;
    recovered: Record<string, Alert & Context>;
    recoveredCurrent: Record<string, Alert & Context>;
  };

  constructor(private readonly options: AlertsClientParams) {
    this.processedAlerts = {
      new: {},
      active: {},
      recovered: {},
      recoveredCurrent: {},
    };
    this.ruleLogPrefix = `${this.options.ruleType.id}`;
    this.alertLimitServices = new AlertLimitService({ maxAlerts: options.maxAlerts });
  }

  public hasReachedAlertLimit() {
    return this.alertLimitServices.hasReachedAlertLimit();
  }

  public checkLimitUsage() {
    this.alertLimitServices.checkLimitUsage();
  }

  public async initialize({ rule, previousRuleExecutionUuid }: InitializeOpts): Promise<void> {
    this.setRuleData(rule);
    if (!previousRuleExecutionUuid) {
      this.options.logger.warn(
        `${this.ruleLogPrefix}: AlertsClient.initialize() did not query for existing alerts because previousRuleExecutionUuid is not specified.`
      );
      return;
    }

    this.options.logger.debug(
      `${this.ruleLogPrefix}: AlertsClient.initialize() called for rule ID ${rule.id}, execution ID ${previousRuleExecutionUuid}`
    );

    const context = this.options.ruleType.alerts?.context;
    const esClient = await this.options.elasticsearchClientPromise;
    const resourceInstalled = await this.options.resourceInstallationPromise;

    if (!resourceInstalled) {
      // TODO RETRY INSTALLATION
      this.options.logger.warn(
        `${this.ruleLogPrefix}: Something went wrong installing resources for context ${context}`
      );
      return;
    }
    const indexTemplateAndPattern = getIndexTemplateAndPattern(context!);

    const query = async (results: Array<SearchHit<Alert & Context>>, from: number = 0) => {
      const {
        hits: { hits, total },
      } = await esClient.search<Alert & Context>({
        index: indexTemplateAndPattern.pattern,
        track_total_hits: true,
        body: {
          from,
          size: QUERY_SIZE,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    [ALERT_RULE_UUID]: rule.id,
                  },
                },
                {
                  term: {
                    [ALERT_RULE_EXECUTION_UUID]: previousRuleExecutionUuid,
                  },
                },
              ],
            },
          },
        },
      });

      // add hits to running result
      results.push(...hits);
      const hitsTotal = (total as SearchTotalHits).value ?? total ?? 0;
      if (from + QUERY_SIZE >= hitsTotal) {
        return;
      }

      await query(results, from + QUERY_SIZE);
    };

    try {
      // Query for all alerts that were updated in the last execution
      const results: Array<SearchHit<Alert & Context>> = [];
      await query(results);

      for (const hit of results) {
        const alertHit: Alert & Context = hit._source as Alert & Context;
        const alertStatus = alertHit[ALERT_STATUS];
        const alertUuid = alertHit[ALERT_UUID];
        if (alertStatus === ALERT_STATUS_ACTIVE) {
          this.trackedAlerts.active[alertHit[ALERT_ID]] = alertHit;
        } else if (alertStatus === ALERT_STATUS_RECOVERED) {
          this.trackedAlerts.recovered[alertHit[ALERT_ID]] = alertHit;
        } else {
          this.options.logger.debug(
            `${this.ruleLogPrefix}: Found alert with status ${alertStatus} which is not recognized.`
          );
        }

        this.trackedAlertIndices[alertUuid] = hit._index;
      }
    } catch (err) {
      this.options.logger.error(
        `${this.ruleLogPrefix}: Error searching for alerts from previous execution - ${err.message}`
      );
    }
  }

  public create(alert: ReportedAlert & Context) {
    const currentTime = new Date().toISOString();
    const alertId = alert[ALERT_ID];

    if (!alertId || isEmpty(alertId)) {
      throw new Error(`Reported alert must include non-empty ${ALERT_ID} field`);
    }

    if (this.hasCalledGetRecoveredAlerts) {
      throw new Error(`Can't create new alerts after calling getRecoveredAlerts()!`);
    }

    if (this.alertHasBeenReported(alertId)) {
      throw new Error(`Can't create alert with id ${alertId} multiple times!`);
    }

    if (this.numAlertsReported++ >= this.options.maxAlerts) {
      this.alertLimitServices.setAlertLimitReached(true);
      throw new Error(
        `Can't create more than ${this.options.maxAlerts} alerts in a single rule run!`
      );
    }

    const trackedAlert = this.trackedAlerts.active[alertId]
      ? this.trackedAlerts.active[alertId]
      : {};

    // Augment the reported alert with framework required fields
    // - alert status
    // - timestamp
    // - required rule metadata, including current execution UUID
    // - tracked alert data, if it exists
    this.reportedAlerts[alertId] = {
      ...trackedAlert,
      ...alert,
      ...this.rule,
      [ALERT_STATUS]: 'active',
      [TIMESTAMP]: currentTime, // TODO - should this be task.startedAt?
    } as Alert & Context;
  }

  public processAndLogAlerts(ruleRunMetricsStore: RuleRunMetricsStore, shouldLogAlerts: boolean) {
    const updateAlertValues = ({
      alert,
      start,
      duration,
      end,
      flappingHistory,
    }: {
      alert: Alert;
      start?: string;
      duration?: string;
      end?: string;
      flappingHistory: boolean[];
    }) => {
      Object.assign(alert, {
        ...alert,
        ...this.rule,
        ...(start ? { [ALERT_START]: start } : {}),
        ...(end ? { [ALERT_END]: end } : {}),
        ...(duration !== undefined ? { [ALERT_DURATION]: duration } : {}),
        [ALERT_UUID]: alert[ALERT_UUID] ? alert[ALERT_UUID] : uuid.v4(),
        [ALERT_FLAPPING_HISTORY]: flappingHistory,
        [ALERT_FLAPPING]: isAlertFlapping(alert),
      });
    };

    const {
      newAlerts: processedAlertsNew,
      activeAlerts: processedAlertsActive,
      currentRecoveredAlerts: processedAlertsRecoveredCurrent,
      recoveredAlerts: processedAlertsRecovered,
    } = processAlerts<Alert & Context>({
      reportedAlerts: { active: this.reportedAlerts, recovered: this.getRecoveredAlertsHelper() },
      trackedAlerts: this.trackedAlerts,
      hasReachedAlertLimit: this.hasReachedAlertLimit(),
      alertLimit: this.options.maxAlerts,
      callbacks: {
        getFlappingHistory: (alert) => alert[ALERT_FLAPPING_HISTORY] ?? [],
        getStartTime: (alert) => alert[ALERT_START],
        updateAlertValues,
      },
    });

    this.processedAlerts.new = processedAlertsNew;
    this.processedAlerts.active = processedAlertsActive;
    this.processedAlerts.recovered = processedAlertsRecovered;
    this.processedAlerts.recoveredCurrent = processedAlertsRecoveredCurrent;

    const getAlertData = (alert: Alert) => ({
      actionGroup: alert[ALERT_ACTION_GROUP],
      flapping: alert[ALERT_FLAPPING] as boolean,
      hasContext: false, // no recovery context yet
      lastScheduledActions: {} as LastScheduledActions, // no last scheduled actions yet
      state: {}, // no state yet
    });

    logAlerts({
      logger: this.options.logger,
      alertingEventLogger: this.options.eventLogger,
      newAlerts: mapValues(processedAlertsNew, (alert) => getAlertData(alert)),
      activeAlerts: mapValues(processedAlertsActive, (alert) => getAlertData(alert)),
      recoveredAlerts: mapValues(processedAlertsRecoveredCurrent, (alert) => getAlertData(alert)),
      ruleLogPrefix: this.ruleLogPrefix,
      ruleRunMetricsStore,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
      shouldPersistAlerts: shouldLogAlerts,
    });
  }

  public getProcessedAlerts(type: 'new' | 'active' | 'recovered' | 'recoveredCurrent') {
    if (this.processedAlerts.hasOwnProperty(type)) {
      return this.processedAlerts[type];
    }

    return {};
  }

  public getRecoveredAlertIds(): string[] {
    this.hasCalledGetRecoveredAlerts = true;
    if (!this.options.ruleType.doesSetRecoveryContext) {
      this.options.logger.debug(
        `Set doesSetRecoveryContext to true on rule type to get access to recovered alerts.`
      );
      return [];
    }

    const recoveredAlerts = this.getRecoveredAlertsHelper();
    return Object.keys(recoveredAlerts ?? {});
  }

  // public update(id: string, updatedAlert: Partial<Alert>) {
  //   this.options.logger.info(`updating alert ${id}`);
  //   // Make sure we're updating something that exists
  //   const existingAlert = this.existingAlerts.find((alert: Alert) => id === get(alert, ALERT_ID));
  //   if (existingAlert) {
  //     // Make sure we're not allowing updates to fields that shouldn't be updated
  //     // by the rule type
  //     const alert = omit(updatedAlert, [
  //       ALERT_ID,
  //       ALERT_UUID,
  //       ALERT_STATUS,
  //       ALERT_START,
  //       ALERT_DURATION,
  //       ALERT_END,
  //       ALERT_ACTION_GROUP,
  //       // ALERT_LAST_NOTIFIED_DATE,
  //       ALERT_RULE_CATEGORY,
  //       ALERT_RULE_CONSUMER,
  //       ALERT_RULE_EXECUTION_UUID,
  //       ALERT_RULE_NAME,
  //       ALERT_RULE_PRODUCER,
  //       ALERT_RULE_TAGS,
  //       ALERT_RULE_TYPE_ID,
  //       ALERT_RULE_UUID,
  //     ]);

  //     this.updatedAlerts.push({
  //       ...existingAlert,
  //       ...alert,
  //       [TIMESTAMP]: new Date().toISOString(),
  //     });
  //   } else {
  //     this.options.logger.warn(`trying to update alert with ${id} which does not exist`);
  //     // need to throw error?
  //   }
  // }

  public async write() {
    const esClient = await this.options.elasticsearchClientPromise;
    // TODO - Lifecycle alerts set some other fields based on alert status
    // Example: workflow status - default to 'open' if not set
    // event action: new alert = 'new', active alert: 'active', otherwise 'close'

    const getAlertData = (alerts: Record<string, Alert & Context>) =>
      mapValues(alerts, (alert) => ({
        flapping: alert[ALERT_FLAPPING] ?? false,
        flappingHistory: alert[ALERT_FLAPPING_HISTORY] ?? [],
      }));

    const { activeAlertIds, recoveredAlertIds } = determineAlertsToPersist(
      getAlertData(this.processedAlerts.active),
      getAlertData(this.processedAlerts.recovered)
    );

    const activeAlertsToIndex = activeAlertIds.map((id: string) => this.processedAlerts.active[id]);
    const recoveredAlertsToIndex = recoveredAlertIds.map(
      (id: string) => this.processedAlerts.recovered[id]
    );

    await esClient.bulk({
      refresh: 'wait_for',
      body: [...activeAlertsToIndex, ...recoveredAlertsToIndex].map((alert) => [
        {
          index: {
            _id: alert[ALERT_UUID],
            // If we know the concrete index for this alert, specify it
            ...(this.trackedAlertIndices[alert[ALERT_UUID]]
              ? { _index: this.trackedAlertIndices[alert[ALERT_UUID]], require_alias: false }
              : {}),
          },
        },
        alert,
      ]),
    });
  }

  // TODO
  // public scheduleActions(params: ScheduleActionsParams) {
  //   const { metricsStore, throttle, notifyWhen, mutedAlertIds } = params;
  //   // const throttleMills = throttle ? parseDuration(throttle) : 0;

  //   // for (const alert of this.preparedAlerts) {
  //   //   let executeAction = true;
  //   //   const muted = mutedAlertIds.has(alert.id);

  //   //   // TODO - would need to recreate the logic for determining throttling
  //   //   // including whether the action group changed
  //   //   const throttled = false;

  //   //   if (throttled || muted) {
  //   //     executeAction = false;
  //   //     this.options.logger.debug(
  //   //       `skipping scheduling of actions for '${alert.id}' in rule ${this.options.ruleType.id}:${
  //   //         this.rule?.id
  //   //       }: '${this.rule?.name}': rule is ${muted ? 'muted' : 'throttled'}`
  //   //     );
  //   //   } else if (
  //   //     notifyWhen === 'onActionGroupChange' /* &&
  //   //     !alert.scheduledActionGroupOrSubgroupHasChanged()*/
  //   //   ) {
  //   //     executeAction = false;
  //   //     this.options.logger.debug(
  //   //       `skipping scheduling of actions for '${alert.id}' in rule ${this.options.ruleType.id}:${this.rule?.id}: '${this.rule?.name}': alert is active but action group has not changed`
  //   //     );
  //   //   }

  //   //   if (executeAction /* && alert.hasScheduledActions()*/) {

  //   //   }
  //   // }
  // }

  public getExecutorServices(): PublicAlertsClient<Context> {
    return {
      create: (...args) => this.create(...args),
      getAlertLimitValue: () => this.alertLimitServices.getAlertLimitValue(),
      setAlertLimitReached: (...args) => this.alertLimitServices.setAlertLimitReached(...args),
      getRecoveredAlertIds: () => this.getRecoveredAlertIds(),
    };
  }

  private getRecoveredAlertsHelper(): Record<string, Alert & Context> {
    const currentTime = new Date().toISOString();
    // Look for active alerts from the previous execution that have not been
    // reported during the current execution. Return a copy so existing
    // alerts cannot be accidentally mutated
    const recoveredAlerts: Record<string, Alert & Context> = {};
    for (const id in this.trackedAlerts.active) {
      if (this.trackedAlerts.active.hasOwnProperty(id)) {
        if (!this.reportedAlerts[id]) {
          recoveredAlerts[id] = {
            ...this.trackedAlerts.active[id],
            // get latest copy of rule and updated execution UUID
            ...this.rule,
            // set status to "recovered"
            [ALERT_STATUS]: 'recovered',
            // update timestamp to current time
            [TIMESTAMP]: currentTime,
          } as Alert & Context;
        }
      }
    }
    return recoveredAlerts;
  }

  private alertHasBeenReported(alertId: string) {
    return !!this.reportedAlerts[alertId];
  }

  private setRuleData(rule: {
    consumer: string;
    executionId: string;
    id: string;
    name: string;
    tags: string[];
    spaceId: string;
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
      [SPACE_IDS]: [rule.spaceId],
    };
    this.ruleLogPrefix = `${this.options.ruleType.id}:${rule.id}: '${rule.name}'`;
  }
}

function isAlertFlapping(alert: Alert): boolean {
  const flappingHistory: boolean[] = alert[ALERT_FLAPPING_HISTORY] ?? [];
  const isCurrentlyFlapping = alert[ALERT_FLAPPING] ?? false;
  return isFlapping(flappingHistory, isCurrentlyFlapping);
}
