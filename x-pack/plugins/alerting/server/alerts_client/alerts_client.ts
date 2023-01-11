/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, get, omit } from 'lodash';
import { Logger, ElasticsearchClient } from '@kbn/core/server';
import {
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_END,
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
  ALERT_UUID,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { type Alert } from '../../common';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { getIndexTemplateAndPattern } from '../alerts_service/types';
import { IAlertsClient, InitializeOpts } from './types';

// export interface IAlertsClient {
//   /**
//    * Sets information about the rule.
//    */
//   setRuleData(rule: SetRuleDataOpts): void;

//   /**
//    * Flag indicating whether max number of allowed alerts has been reported.
//    */
//   hasReachedAlertLimit(): boolean;

//   /**
//    * Get alerts matching given rule ID and rule execution uuid
//    * - Allow specifying a different index than the default (for security alerts)
//    */
//   loadExistingAlerts(params: LoadExistingAlertsParams): Promise<void>;

//   /**
//    * Creates new alert document
//    */
//   create(alert: Alert): void;

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

//   /**
//    * Returns subset of functions available to rule executors
//    * Don't expose any functions with direct read or write access to the alerts index
//    */
//   getExecutorServices(): PublicAlertsClient;
// }

export type PublicAlertsClient = Pick<IAlertsClient<Alert>, 'create' | 'getRecoveredAlerts'> & {
  getExistingAlerts(): Alert[];
};

export interface SetRuleDataOpts {
  consumer: string;
  executionId: string;
  id: string;
  name: string;
  tags: string[];
  spaceId: string;
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
  [SPACE_IDS]: string[];
}

interface AlertsClientParams {
  logger: Logger;
  ruleType: UntypedNormalizedRuleType;
  maxAlerts: number;
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  resourceInstallationPromise: Promise<boolean>;
}

interface LoadExistingAlertsParams {
  ruleId: string;
  previousRuleExecutionUuid: string;
}

export class AlertsClient implements IAlertsClient<Alert> {
  private rule: AlertRuleSchema | null = null;
  private ruleLogPrefix: string;

  private hasCalledGetRecoveredAlerts: boolean = false;
  private reachedAlertLimit: boolean = false;

  // private alertIdsWithActionGroupChanges: string[] = [];

  // Alerts from the previous rule execution
  private previousAlerts: Alert[] = [];

  // Alerts created during the current rule execution
  private createdAlerts: Alert[] = [];

  // // Alerts ready to be written
  // private preparedAlerts: AlertSchema[] = [];

  // Alerts with partial updates during the current rule execution
  private updatedAlerts: Array<Partial<Alert>> = [];

  constructor(private readonly options: AlertsClientParams) {
    this.ruleLogPrefix = `${this.options.ruleType.id}`;
  }

  private setRuleData(rule: SetRuleDataOpts) {
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

  public hasReachedAlertLimit() {
    return this.reachedAlertLimit;
  }

  public async initialize({ rule, previousRuleExecutionUuid }: InitializeOpts): Promise<void> {
    if (!previousRuleExecutionUuid) {
      return;
    }

    this.options.logger.info(
      `loadExistingAlerts rule id ${rule.id}, execution ${previousRuleExecutionUuid}`
    );

    this.setRuleData(rule);
    const context = this.options.ruleType.alerts?.context;
    const esClient = await this.options.elasticsearchClientPromise;
    const resourceInstalled = await this.options.resourceInstallationPromise;

    if (!resourceInstalled) {
      this.options.logger.warn(`Something went wrong installing resources for context ${context}`);
      return;
    }
    const indexTemplateAndPattern = getIndexTemplateAndPattern(context!);

    try {
      // TODO - should iterate query to make sure we get all the alerts
      // if the total is above the size param
      const {
        hits: { hits, total },
      } = await esClient.search<Alert>({
        index: indexTemplateAndPattern.pattern,
        track_total_hits: true,
        body: {
          size: 1000,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    [ALERT_RULE_UUID]: ruleId,
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

      this.previousAlerts = hits.map((hit) => hit._source!);
    } catch (err) {
      this.options.logger.error(
        `Error searching for alerts from previous execution - ${err.message}`
      );
    }
  }

  public create(alertToCreate: Alert) {
    if (!this.options.ruleType.alerts) {
      throw new Error(
        `Can't create alert in AlertsClient because rule type has not registered alert configuration.`
      );
    }

    if (this.hasCalledGetRecoveredAlerts) {
      throw new Error(`Can't create new alerts after calling getRecoveredAlerts()!`);
    }

    if (
      this.createdAlerts.find(
        (alert: Alert) => get(alert, ALERT_ID) === get(alertToCreate, ALERT_ID)
      )
    ) {
      throw new Error(`Can't create alert with id ${get(alertToCreate, ALERT_ID)} multiple times!`);
    }

    if (this.createdAlerts.length + 1 >= this.options.maxAlerts) {
      this.reachedAlertLimit = true;
      throw new Error(`Can't create new alerts as max allowed alerts have been created!`);
    }

    // Fill in rule information
    this.createdAlerts.push({
      ...alert,
      ...this.rule,
      [ALERT_STATUS]: 'active',
      [TIMESTAMP]: new Date().toISOString(),
    } as Alert);
  }

  public get existingAlerts(): Alert[] {
    return cloneDeep(this.previousAlerts);
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
        !this.createdAlerts.some(
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
      getExistingAlerts: () => this.existingAlerts,
      getRecoveredAlerts: () => this.getRecoveredAlerts(),
    };
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
