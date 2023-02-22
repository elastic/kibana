/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaRequest } from '@kbn/core-http-server';

import type { FleetRequestHandlerContext } from '../types';

import { appContextService } from './app_context';

export interface AuditLog {
  '@timestamp': string;
  username?: string;
  request_id: string;
  request_path: string;
  request_method?: string;
  request_body?: string;
  response_body?: string;
  status_code: number;
}

const EXCLUDED_PATHS = ['/setup'];
const AUDITED_METHODS = ['post', 'put', 'delete'];
const DESTINATION_DATA_STREAM = 'logs-fleet.audit.generic';

/**
 * Logs mutative request/responses to a data stream for audit/compliance purposes
 */
export async function handleAuditLogging<TContext extends FleetRequestHandlerContext>(
  context: TContext,
  request: KibanaRequest,
  response: IKibanaResponse
) {
  const method: string = request.route.method;

  // Don't perform audit logging non-mutative requests
  if (
    !AUDITED_METHODS.includes(method.toLowerCase()) ||
    EXCLUDED_PATHS.some((p) => request.route.path.endsWith(p))
  ) {
    return;
  }

  const isAuditLoggingEnabled = appContextService.getConfig()?.auditLogging?.enabled;
  const security = appContextService.getSecurity();
  const user = security.authc.getCurrentUser(request);
  const esClient = (await context.core).elasticsearch.client;

  if (isAuditLoggingEnabled) {
    const responseLog: AuditLog = {
      '@timestamp': new Date().toISOString(),
      username: user?.username,
      request_id: request.uuid,
      request_path: request.route.path,
      request_method: request.route.method,
      request_body: JSON.stringify(request.body),
      response_body: JSON.stringify(response.payload),
      status_code: response.status,
    };

    await esClient.asCurrentUser.transport.request({
      method: 'POST',
      path: `${DESTINATION_DATA_STREAM}/_doc`,
      body: {
        ...responseLog,
      },
    });
  }
}
