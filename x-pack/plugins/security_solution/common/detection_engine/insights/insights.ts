/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subscription } from 'rxjs';
import { bufferTime } from 'rxjs/operators';
import moment from 'moment';
import { Sha256 } from 'src/core/public/utils';

interface AlertContext {
  alert_id: string;
  rule_id?: string;
}

interface AlertStatusAction {
  alert_status: string;
  action_timestamp: string;
}

type InsightsContext = AlertContext;
type InsightsAction = AlertStatusAction;

export interface InsightsPayload {
  state: {
    page: string;
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
    // Subscription needs to publish events
    this.subscription = this.observable.pipe(bufferTime(10_000)).subscribe();
  }

  private getUserHash(username: string): string {
    const concatValue = username + this.clusterId;
    const sha = new Sha256().update(concatValue, 'utf8').digest('hex');
    return sha;
  }

  public addAlertStatus(
    alertIds: string[],
    sessionId: string,
    ruleId: string,
    username: string,
    page: string,
    status: string
  ) {
    const hashedId = this.getUserHash(username);
    for (let i = 0; i < alertIds.length; i++) {
      const now = moment().toISOString();
      const payload = {
        page,
        cluster_id: this.clusterId,
        user_id: hashedId,
        session_id: sessionId,
        context: {
          alert_id: alertIds[i],
          rule_id: ruleId,
        },
        action: {
          alert_status: status,
          action_timestamp: now,
        },
      };
      // Observable is still not wired up correctly
      this.observable.next(payload);
    }
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
