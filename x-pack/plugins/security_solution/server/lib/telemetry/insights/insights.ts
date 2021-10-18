/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { sha256 } from 'js-sha256';

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
  private clusterId: string;

  constructor(clusterId: string) {
    this.clusterId = clusterId;
  }

  private getUserHash(username: string): string {
    const concatValue = username + this.clusterId;
    const sha = sha256.create().update(concatValue).hex();
    return sha;
  }

  public createAlertStatusPayloads(
    alertIds: string[],
    sessionId: string,
    username: string,
    page: string,
    status: string,
    ruleId?: string
  ): InsightsPayload[] {
    const payloads: InsightsPayload[] = [];
    const hashedId = this.getUserHash(username);
    for (let i = 0; i < alertIds.length; i++) {
      const now = moment().toISOString();
      const payload = {
        state: {
          page,
          cluster_id: this.clusterId,
          user_id: hashedId,
          session_id: sessionId,
          context: {
            alert_id: alertIds[i],
            rule_id: ruleId,
          },
        },
        action: {
          alert_status: status,
          action_timestamp: now,
        },
      };
      payloads.push(payload);
    }
    return payloads;
  }
}
