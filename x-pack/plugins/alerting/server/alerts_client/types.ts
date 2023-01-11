/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RawAlertInstance } from '../../common';
import { PublicAlertFactory } from '../alert/create_alert_factory';
import { PublicAlertsClient } from './alerts_client';

export interface InitializeOpts {
  deserializedAlerts?: Record<string, RawAlertInstance>;
  previousRuleExecutionUuid?: string;
  rule: {
    consumer: string;
    executionId: string;
    id: string;
    name: string;
    tags: string[];
    spaceId: string;
  };
}

export interface IAlertsClient {
  /**
   * Flag indicating whether max number of allowed alerts has been reported.
   */
  hasReachedAlertLimit(): boolean;

  initialize(opts: InitializeOpts): Promise<void>;

  getExecutorServices(): PublicAlertFactory | PublicAlertsClient;

  // /**
  //  * Get alerts matching given rule ID and rule execution uuid
  //  * - Allow specifying a different index than the default (for security alerts)
  //  */
  // loadExistingAlerts(params: LoadExistingAlertsParams): Promise<void>;

  // /**
  //  * Creates new alert document
  //  */
  // create(alert: Alert): void;

  // /**
  //  * Returns alerts from previous rule execution
  //  * - Returns a copy so the original list cannot be corrupted
  //  */
  // get existingAlerts(): Alert[];

  // /**
  //  * Returns list of recovered alerts, as determined by framework
  //  */
  // getRecoveredAlerts(): Alert[];

  // /**
  //  * Partially update an alert document
  //  * - Can use this for recovery alerts
  //  * - Control which fields can be updated?
  //  */
  // update(id: string, updatedAlert: Partial<Alert>): void;

  // // /**
  // //  * Triggers auto-recovery detection unless rule type has opted out
  // //  * Writes all alerts to default index.
  // //  * Handles logging to event log as well
  // //  */
  // // writeAlerts(params?: WriteAlertParams): void;

  // // /**
  // //  * This might not belong on the AlertsClient but putting it here for now
  // //  */
  // // scheduleActions(params: ScheduleActionsParams): void;

  // /**
  //  * Returns subset of functions available to rule executors
  //  * Don't expose any functions with direct read or write access to the alerts index
  //  */
  // getExecutorServices(): PublicAlertsClient;
}
