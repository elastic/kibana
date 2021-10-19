/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { KibanaRequest } from 'src/core/server';
import { sha256 } from 'js-sha256';

interface AlertContext {
  alert_id: string;
  rule_id?: string;
}

interface AlertStatusAction {
  alert_status: string;
  action_timestamp: string;
}

export interface InsightsPayload {
  state: {
    page: string;
    cluster_id: string;
    user_id: string;
    session_id: string;
    context: AlertContext;
  };
  action: AlertStatusAction;
}

// Generic insights service class that works with the insights observable
// Both server and client plugins instancates a singleton version of this class
export class InsightsService {
  private clusterId: string;

  constructor(clusterId: string) {
    this.clusterId = clusterId;
  }

  public getSessionIDfromKibanaRequest(request: KibanaRequest): string {
    const rawCookieHeader = request.headers.cookie;
    if (!rawCookieHeader) {
      return '';
    }
    const cookieHeaders = Array.isArray(rawCookieHeader) ? rawCookieHeader : [rawCookieHeader];
    let tokenPackage: string | undefined;

    cookieHeaders
      .flatMap((rawHeader) => rawHeader.split('; '))
      .forEach((rawCookie) => {
        const [cookieName, cookieValue] = rawCookie.split('=');
        if (cookieName === 'sid') tokenPackage = cookieValue;
      });

    if (tokenPackage) {
      const concatValue = tokenPackage + this.clusterId;
      const sha = sha256.create().update(concatValue).hex();
      return sha;
    } else {
      return '';
    }
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
    return alertIds.map((alertId) => ({
      state: {
        page,
        cluster_id: this.clusterId,
        user_id: this.getUserHash(username),
        session_id: sessionId,
        context: {
          alert_id: alertId,
          rule_id: ruleId,
        },
      },
      action: {
        alert_status: status,
        action_timestamp: moment().toISOString(),
      },
    }));
  }
}
