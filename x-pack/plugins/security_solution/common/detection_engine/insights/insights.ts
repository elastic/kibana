/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subscription } from 'rxjs';
import { bufferTime } from 'rxjs/operators';

interface AlertContext {
  alert_id: string;
  rule_id?: string;
}

interface DismissAlertAction {
  dismiss_timestamp: string;
}
interface AcknowledgeAlertAction {
  acknowledge_timestamp: string;
}

type InsightsContext = AlertContext;
type InsightsAction = DismissAlertAction | AcknowledgeAlertAction;

export interface InsightsPayload {
  state: {
    page: string;
    pageload_timestamp: string;
    cluster_id: string;
    user_id: string;
    session_id: string;
    context: InsightsContext;
  };
  action: InsightsAction;
}

// Generic insights service class that works with the insights observable
// Both server and client plugins instancates a singleton version of this class
export class InsightsService {
  private observable: Observable<InsightsPayload> | null = null;
  private subscription: Subscription | null = null;
  private clusterId: string;

  constructor(clusterId: string) {
    this.clusterId = clusterId;
  }

  public start(insights$: Observable<InsightsPayload>, clusterId: string) {
    this.observable = insights$;
    this.subscription = this.observable.pipe(bufferTime(10_000)).subscribe();
  }

  public add(alertId: string, sessionId: string) {}

  private buildAlertAction(status: string): InsightsAction {
    return { dismiss_timestamp: '' };
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
