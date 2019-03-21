/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseToolkit } from 'hapi';

export function initOverwrittenSessionView(server: any) {
  server.route({
    method: 'GET',
    path: '/overwritten_session',
    handler(request: Request, h: ResponseToolkit) {
      return (h as any).renderAppWithDefaultConfig(
        server.getHiddenUiAppById('overwritten_session')
      );
    },
  });
}
