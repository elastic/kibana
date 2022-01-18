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
}

interface AlertStatusAction {
  alert_status: string;
  action_timestamp: string;
}

export interface InsightsPayload {
  state: {
    route: string;
    cluster_id: string;
    user_id: string;
    session_id: string;
    context: AlertContext;
  };
  action: AlertStatusAction;
}
export function getSessionIDfromKibanaRequest(clusterId: string, request: KibanaRequest): string {
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
    return getClusterHashSalt(clusterId, tokenPackage);
  } else {
    return '';
  }
}

function getClusterHashSalt(clusterId: string, toHash: string): string {
  const concatValue = toHash + clusterId;
  const sha = sha256.create().update(concatValue).hex();
  return sha;
}

export function createAlertStatusPayloads(
  clusterId: string,
  alertIds: string[],
  sessionId: string,
  username: string,
  route: string,
  status: string
): InsightsPayload[] {
  return alertIds.map((alertId) => ({
    state: {
      route,
      cluster_id: clusterId,
      user_id: getClusterHashSalt(clusterId, username),
      session_id: sessionId,
      context: {
        alert_id: alertId,
      },
    },
    action: {
      alert_status: status,
      action_timestamp: moment().toISOString(),
    },
  }));
}
