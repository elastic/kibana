/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { cloneDeep, isEmpty, omit } from 'lodash';
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
import { millisToNanos } from '@kbn/event-log-plugin/server';
import { LastScheduledActions, type Alert } from '../../common';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { getIndexTemplateAndPattern } from '../alerts_service/types';
import { AlertLimitService, IAlertLimitService } from './alert_limit_service';
import { ReportedAlert } from './types';
import { isFlapping, processAlerts } from '../lib';
import { logAlerts } from '../task_runner/log_alerts';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { RuleRunMetricsStore } from '../lib/rule_run_metrics_store';

const QUERY_SIZE = 1000;

export interface IAlertsClient {
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
  create(alert: Alert): void;

  processAndLogAlerts(): void;

  //   /**
  //    * Returns alerts from previous rule execution
  //    * - Returns a copy so the original list cannot be corrupted
  //    */
  //   get existingAlerts(): Alert[];
  //   /**
  //    * Returns list of recovered alerts, as determined by framework
  //    */
  //   getRecoveredAlerts(): Alert[];
  //   /**
  //    * Partially update an alert document
  //    * - Can use this for recovery alerts
  //    * - Control which fields can be updated?
  //    */
  //   update(id: string, updatedAlert: Partial<Alert>): void;
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
  getExecutorServices(): PublicAlertsClient;
}

export type PublicAlertsClient = Pick<IAlertsClient, 'create'> &
  Pick<IAlertLimitService, 'getAlertLimitValue' | 'setAlertLimitReached'> /* & {
  getExistingAlerts(): Alert[];
}*/;

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

export class AlertsClient implements IAlertsClient {
  private alertLimitServices: AlertLimitService;
  private rule: AlertRuleSchema | null = null;
  private ruleLogPrefix: string;

  private hasCalledGetRecoveredAlerts: boolean = false;

  // Alerts that were reported as active or recovered in the previous rule execution
  private trackedAlerts: {
    active: Record<string, Alert>;
    recovered: Record<string, Alert>;
  } = {
    active: {},
    recovered: {},
  };

  // Alerts reported by rule executor during the current rule execution
  private numAlertsReported: number = 0;
  private reportedAlerts: Record<string, Alert> = {};

  private processedAlerts: {
    new: Record<string, Alert>;
    active: Record<string, Alert>;
    recovered: Record<string, Alert>;
    recoveredCurrent: Record<string, Alert>;
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

    const query = async (results: Array<SearchHit<Alert>>, from: number = 0) => {
      const {
        hits: { hits, total },
      } = await esClient.search<Alert>({
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
      const results: Array<SearchHit<Alert>> = [];
      await query(results);

      for (const hit of results) {
        const alertHit: Alert = hit._source as Alert;
        const alertStatus = alertHit[ALERT_STATUS];
        if (alertStatus === ALERT_STATUS_ACTIVE) {
          this.trackedAlerts.active[alertHit[ALERT_ID]] = alertHit;
        } else if (alertStatus === ALERT_STATUS_RECOVERED) {
          this.trackedAlerts.recovered[alertHit[ALERT_ID]] = alertHit;
        } else {
          this.options.logger.debug(
            `${this.ruleLogPrefix}: Found alert with status ${alertStatus} which is not recognized.`
          );
        }
      }
    } catch (err) {
      this.options.logger.error(
        `${this.ruleLogPrefix}: Error searching for alerts from previous execution - ${err.message}`
      );
    }
  }

  public create(alert: ReportedAlert) {
    const currentTime = new Date().toISOString();
    const alertId = alert[ALERT_ID];

    if (!alertId || isEmpty(alertId)) {
      throw new Error(`Reported alert must include non-empty ${ALERT_ID} field`);
    }

    if (this.hasCalledGetRecoveredAlerts) {
      throw new Error(`Can't create new alerts after calling getRecoveredAlerts()!`);
    }

    if (this.alertHasBeenReported(alertId)) {
      throw new Error(`Can't report alert with id ${alertId} multiple times!`);
    }

    if (this.numAlertsReported++ >= this.options.maxAlerts) {
      this.alertLimitServices.setAlertLimitReached(true);
      throw new Error(
        `Can't report more than ${this.options.maxAlerts} alerts in a single rule run!`
      );
    }

    // Augment the reported alert with framework required fields
    // - alert status
    // - timestamp
    // - required rule metadata, including current execution UUID
    const augmentedAlert: Alert = {
      ...alert,
      ...this.rule,
      [ALERT_STATUS]: 'active',
      [TIMESTAMP]: currentTime, // TODO - should this be task.startedAt?
    } as Alert;

    this.reportedAlerts[alertId] = augmentedAlert;
  }

  public processAndLogAlerts({
    eventLogger,
    ruleLabel,
    ruleRunMetricsStore,
    shouldLogAndScheduleActionsForAlerts,
  }: {
    eventLogger: AlertingEventLogger;
    ruleLabel: string;
    shouldLogAndScheduleActionsForAlerts: boolean;
    ruleRunMetricsStore: RuleRunMetricsStore;
  }) {
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
      alert = {
        ...alert,
        ...(start ? { [ALERT_START]: start } : {}),
        ...(end ? { [ALERT_END]: end } : {}),
        ...(duration !== undefined ? { [ALERT_DURATION]: duration } : {}),
        [ALERT_FLAPPING_HISTORY]: flappingHistory,
        [ALERT_FLAPPING]: isAlertFlapping(alert),
      };
    };

    const {
      newAlerts: processedAlertsNew,
      activeAlerts: processedAlertsActive,
      currentRecoveredAlerts: processedAlertsRecoveredCurrent,
      recoveredAlerts: processedAlertsRecovered,
    } = processAlerts<Alert>({
      // todo - a way to report recovered alerts?
      reportedAlerts: { active: this.reportedAlerts, recovered: {} },
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

    logAlerts<Alert>({
      logger: this.options.logger,
      alertingEventLogger: eventLogger,
      newAlerts: processedAlertsNew,
      activeAlerts: processedAlertsActive,
      recoveredAlerts: processedAlertsRecoveredCurrent,
      ruleLogPrefix: ruleLabel,
      ruleRunMetricsStore,
      canSetRecoveryContext: this.options.ruleType.doesSetRecoveryContext ?? false,
      shouldPersistAlerts: shouldLogAndScheduleActionsForAlerts,
      getAlertData: (alert: Alert) => {
        return {
          actionGroup: alert[ALERT_ACTION_GROUP],
          hasContext: false, // no recovery context yet
          lastScheduledActions: {} as LastScheduledActions, // no last scheduled actions yet
          state: {}, // no state yet
          flapping: alert[ALERT_FLAPPING] as boolean,
        };
      },
    });
  }

  public getRecoveredAlerts(): Alert[] {
    this.hasCalledGetRecoveredAlerts = true;
    if (
      /* !this.options.ruleType.autoRecoverAlerts ||*/ !this.options.ruleType.doesSetRecoveryContext
    ) {
      this.options.logger.debug(
        `Set doesSetRecoveryContext to true on rule type to get access to recovered alerts.`
      );
      return [];
    }

    // TODO ADD PROCESSING FOR ALERT LIMIT AND FLAPPING :(

    // Look for alerts from the previous execution that have not been
    // reported during the current execution. Return a copy so existing
    // alerts cannot be accidentally mutated
    return this.existingAlerts.filter(
      (previousAlert: Alert) =>
        !this.reportedAlerts.some(
          (alert: Alert) => get(alert, ALERT_ID) === get(previousAlert, ALERT_ID)
        )
    );
  }

  public update(id: string, updatedAlert: Partial<Alert>) {
    this.options.logger.info(`updating alert ${id}`);
    // Make sure we're updating something that exists
    const existingAlert = this.existingAlerts.find((alert: Alert) => id === get(alert, ALERT_ID));
    if (existingAlert) {
      // Make sure we're not allowing updates to fields that shouldn't be updated
      // by the rule type
      const alert = omit(updatedAlert, [
        ALERT_ID,
        ALERT_UUID,
        ALERT_STATUS,
        ALERT_START,
        ALERT_DURATION,
        ALERT_END,
        ALERT_ACTION_GROUP,
        // ALERT_LAST_NOTIFIED_DATE,
        ALERT_RULE_CATEGORY,
        ALERT_RULE_CONSUMER,
        ALERT_RULE_EXECUTION_UUID,
        ALERT_RULE_NAME,
        ALERT_RULE_PRODUCER,
        ALERT_RULE_TAGS,
        ALERT_RULE_TYPE_ID,
        ALERT_RULE_UUID,
      ]);

      this.updatedAlerts.push({
        ...existingAlert,
        ...alert,
        [TIMESTAMP]: new Date().toISOString(),
      });
    } else {
      this.options.logger.warn(`trying to update alert with ${id} which does not exist`);
      // need to throw error?
    }
  }

  // public async writeAlerts(params?: WriteAlertParams) {
  //   this.options.logger.info(`writeAlerts`);
  //   this.options.logger.info(`${this.existingAlerts.length} existing alerts`);
  //   this.options.logger.info(`${this.createdAlerts.length} created alerts`);
  //   // Update alert with status and prepare for writing
  //   // TODO - Lifecycle alerts set some other fields based on alert status
  //   // Do we need to move those to the framework? Otherwise we would need to
  //   // allow rule types to set these fields but they won't know the status
  //   // of the alert beforehand
  //   // Example: workflow status - default to 'open' if not set
  //   // event action: new alert = 'new', active alert: 'active', otherwise 'close'
  //   this.prepareAlerts(this.options.ruleType.autoRecoverAlerts ?? true);

  //   this.options.logger.info(`preparedAlerts ${JSON.stringify(this.preparedAlerts)}`);

  //   // Bulk index alerts
  //   const esClient = await this.options.elasticsearchClientPromise;
  //   await esClient.bulk({
  //     body: this.preparedAlerts.flatMap((alert) => [
  //       { index: { _id: alert[ALERT_UUID], _index: DEFAULT_ALERTS_INDEX, require_alias: false } },
  //       alert,
  //     ]),
  //   });

  //   if (params) {
  //     this.logAlerts(params.eventLogger, params.metricsStore);
  //   }
  // }

  // // TODO
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

  public getExecutorServices(): PublicAlertsClient {
    return {
      create: (...args) => this.create(...args),
      getAlertLimitValue: () => this.alertLimitServices.getAlertLimitValue(),
      setAlertLimitReached: (...args) => this.alertLimitServices.setAlertLimitReached(...args),
      // getExistingAlerts: () => this.existingAlerts,
      // getRecoveredAlerts: () => this.getRecoveredAlerts(),
    };
  }

  private alertHasBeenReported(alertId: string) {
    return !!this.reportedAlerts.active[alertId] || !!this.reportedAlerts.new[alertId];
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

  // private prepareAlerts(shouldRecover: boolean) {
  //   const currentTime = new Date().toISOString();

  //   // Active alerts
  //   for (const alert of this.createdAlerts) {
  //     // Look for this alert in existing alerts
  //     const existingAlert = this.existingAlerts.find(
  //       ({ [ALERT_INSTANCE_ID]: id }) => id === alert[ALERT_INSTANCE_ID]
  //     );
  //     if (existingAlert) {
  //       // Copy over start time and update duration
  //       const durationInMs =
  //         new Date(currentTime).valueOf() -
  //         new Date(existingAlert[ALERT_START] as string).valueOf();
  //       const duration = existingAlert[ALERT_START] ? millisToNanos(durationInMs) : undefined;

  //       this.preparedAlerts.push({
  //         ...alert,
  //         ...(existingAlert[ALERT_START] ? { [ALERT_START]: existingAlert[ALERT_START] } : {}),
  //         ...(duration !== undefined ? { [ALERT_DURATION]: duration } : {}),
  //         ...(existingAlert[ALERT_UUID] ? { [ALERT_UUID]: existingAlert[ALERT_UUID] } : {}),
  //         [ALERT_WORKFLOW_STATUS]: existingAlert[ALERT_WORKFLOW_STATUS] ?? 'open',
  //         [EVENT_ACTION]: 'active',
  //       });

  //       // If action group action subgroup has changed, may want to schedule actions
  //       if (
  //         existingAlert[ALERT_ACTION_GROUP] !== alert[ALERT_ACTION_GROUP] ||
  //         existingAlert[ALERT_ACTION_SUBGROUP] !== alert[ALERT_ACTION_SUBGROUP]
  //       ) {
  //         this.alertIdsWithActionGroupChanges.push(alert[ALERT_INSTANCE_ID]);
  //       }
  //     } else {
  //       // Add current time as start time, seed duration with '0' and generate uuid
  //       this.preparedAlerts.push({
  //         ...alert,
  //         [ALERT_START]: currentTime,
  //         [ALERT_DURATION]: '0',
  //         [ALERT_UUID]: uuid.v4(),

  //         // adding these because lifecycle executor adds these
  //         [ALERT_WORKFLOW_STATUS]: 'open',
  //         [EVENT_ACTION]: 'new',
  //       });
  //       this.alertIdsWithActionGroupChanges.push(alert[ALERT_INSTANCE_ID]);
  //     }
  //   }

  //   if (this.createdAlerts.length > 0) {
  //     this.options.logger.debug(
  //       `rule ${this.ruleLogPrefix} has ${
  //         this.createdAlerts.length
  //       } active alerts: ${JSON.stringify(
  //         this.createdAlerts.map(({ id, actionGroup }) => ({
  //           instanceId: id,
  //           actionGroup,
  //         }))
  //       )}`
  //     );
  //   }

  //   // Recovered alerts
  //   if (shouldRecover) {
  //     this.options.logger.info('calculating recovery alerts');
  //     const recoveredAlerts = this.existingAlerts.filter(
  //       ({ [ALERT_INSTANCE_ID]: id1 }) =>
  //         !this.createdAlerts.some(({ [ALERT_INSTANCE_ID]: id2 }) => id2 === id1)
  //     );

  //     if (recoveredAlerts.length > 0) {
  //       this.options.logger.debug(
  //         `rule ${this.ruleLogPrefix} has ${
  //           recoveredAlerts.length
  //         } recovered alerts: ${JSON.stringify(
  //           recoveredAlerts.map(({ id }) => ({ instanceId: id }))
  //         )}`
  //       );
  //     }

  //     this.options.logger.info(`recoveredAlerts ${recoveredAlerts.length}`);

  //     for (const alert of recoveredAlerts) {
  //       // Look for updates to this alert
  //       const updatedAlert = this.updatedAlerts.find(
  //         ({ [ALERT_INSTANCE_ID]: id }) => id === alert[ALERT_INSTANCE_ID]
  //       );

  //       const durationInMs =
  //         new Date(currentTime).valueOf() - new Date(alert[ALERT_START] as string).valueOf();
  //       const duration = alert[ALERT_START] ? millisToNanos(durationInMs) : undefined;

  //       if (updatedAlert) {
  //         this.preparedAlerts.push({
  //           ...alert,
  //           ...updatedAlert,
  //           [ALERT_ACTION_GROUP]: this.options.ruleType.recoveryActionGroup.id,
  //           [ALERT_STATUS]: 'recovered',
  //           [ALERT_DURATION]: duration,
  //           [ALERT_END]: currentTime,
  //           [EVENT_ACTION]: 'recovered',
  //         });
  //       } else {
  //         // TODO - This alert has recovered but there are no updates to it
  //         // What should we do here?
  //         //  - 1. Strip out previous information and write it with the bare minimum of information?
  //         //  - 2. Persist information from previous run? This could include context and state
  //         //         fields that might not be relevant anymore
  //         this.preparedAlerts.push({
  //           ...alert,
  //           [ALERT_ACTION_GROUP]: this.options.ruleType.recoveryActionGroup.id,
  //           [ALERT_STATUS]: 'recovered',
  //           [ALERT_DURATION]: duration,
  //           [ALERT_END]: currentTime,
  //           [EVENT_ACTION]: 'recovered',
  //         });

  //         if (this.options.ruleType.doesSetRecoveryContext) {
  //           this.options.logger.debug(
  //             `rule ${this.ruleLogPrefix} has no recovery context specified for recovered alert ${alert[ALERT_UUID]}`
  //           );
  //         }
  //       }
  //     }
  //   }
  // }

  // private logAlerts(eventLogger: AlertingEventLogger, metricsStore: RuleRunMetricsStore) {
  //   const activeAlerts = this.preparedAlerts.filter(
  //     ({ [ALERT_STATUS]: status }) => status === 'active'
  //   );
  //   const newAlerts = this.preparedAlerts.filter(
  //     ({ [ALERT_STATUS]: status, [ALERT_DURATION]: duration }) =>
  //       status === 'active' && duration === '0'
  //   );
  //   const recoveredAlerts = this.preparedAlerts.filter(
  //     ({ [ALERT_STATUS]: status }) => status === 'recovered'
  //   );

  //   metricsStore.setNumberOfNewAlerts(newAlerts.length);
  //   metricsStore.setNumberOfActiveAlerts(activeAlerts.length);
  //   metricsStore.setNumberOfRecoveredAlerts(recoveredAlerts.length);

  //   for (const alert of this.preparedAlerts) {
  //     const eventLogMessagesAndActions: Array<{ message: string; action: string }> = [];

  //     if (alert[ALERT_STATUS] === 'recovered') {
  //       eventLogMessagesAndActions.push({
  //         action: EVENT_LOG_ACTIONS.recoveredInstance,
  //         message: `${this.ruleLogPrefix} alert '${alert[ALERT_INSTANCE_ID]}' has recovered`,
  //       });
  //     } else if (alert[ALERT_STATUS] === 'active') {
  //       if (alert[ALERT_DURATION] === '0') {
  //         eventLogMessagesAndActions.push({
  //           action: EVENT_LOG_ACTIONS.newInstance,
  //           message: `${this.ruleLogPrefix} created new alert: '${alert[ALERT_INSTANCE_ID]}'`,
  //         });
  //       }

  //       eventLogMessagesAndActions.push({
  //         action: EVENT_LOG_ACTIONS.activeInstance,
  //         message: `${this.ruleLogPrefix} active alert: '${alert[ALERT_INSTANCE_ID]}' in ${
  //           alert[ALERT_ACTION_SUBGROUP]
  //             ? `actionGroup(subgroup): '${alert[ALERT_ACTION_GROUP]}(${alert[ALERT_ACTION_SUBGROUP]})'`
  //             : `actionGroup: '${alert[ALERT_ACTION_GROUP]}'`
  //         }`,
  //       });
  //     }

  //     for (const { action, message } of eventLogMessagesAndActions) {
  //       eventLogger.logAlert({
  //         action,
  //         id: alert[ALERT_INSTANCE_ID],
  //         group: alert[ALERT_ACTION_GROUP],
  //         subgroup: alert[ALERT_ACTION_SUBGROUP],
  //         message,
  //         state: {
  //           start: alert[ALERT_START],
  //           end: alert[ALERT_END],
  //           duration: alert[ALERT_DURATION],
  //         },
  //       });
  //     }
  //   }
  // }
}

function isAlertFlapping(alert: Alert): boolean {
  const flappingHistory: boolean[] = alert[ALERT_FLAPPING_HISTORY] ?? [];
  const isCurrentlyFlapping = alert[ALERT_FLAPPING] ?? false;
  return isFlapping(flappingHistory, isCurrentlyFlapping);
}
