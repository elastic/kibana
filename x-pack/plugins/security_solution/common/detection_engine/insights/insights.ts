/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subscription } from 'rxjs';

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
  private observable: Observable<IInsights> | null = null;
  private subscription: Subscription | null = null;
  private buffer: InsightsPayload[] | null = null;

  public start(insights$: Observable<IInsights>) {
    this.observable = insights$;
    this.subscription = this.observable.subscribe(this.updateInformation.bind(this));
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}

export const isAtLeast = (insights: IInsights | null, level: InsightsType): boolean => {
  return !!insights && insights.isAvailable && insights.isActive && insights.hasAtLeast(level);
};
