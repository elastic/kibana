/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuditEventDecorator, KibanaRequest } from 'src/core/server';

export interface HttpRequestEventArgs {
  request: KibanaRequest;
}

export const httpRequestEvent: AuditEventDecorator<HttpRequestEventArgs> = (event, { request }) => {
  const [path, query] = request.url.path?.split('?') ?? [];

  return {
    ...event,
    message: `User [${event.user?.name}] is requesting [${path}] endpoint`,
    event: {
      action: 'http_request',
      category: 'web',
      outcome: 'unknown',
    },
    http: {
      request: {
        method: request.route.method,
      },
    },
    url: {
      domain: request.url.hostname,
      path,
      port: request.url.port ? parseInt(request.url.port, 10) : undefined,
      query,
      scheme: request.url.protocol,
    },
  };
};
