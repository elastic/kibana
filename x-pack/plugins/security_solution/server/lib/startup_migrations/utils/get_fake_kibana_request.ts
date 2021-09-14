/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';

/**
 * Copied from "x-pack/plugins/alerting/server/invalidate_pending_api_keys/task.ts"
 * But to be fare this pattern exists _everywhere_ within Kibana and in different
 * forms in particular with the "getBasePath". This one seemed the "best of copied breed"
 * in that you can set the basePath.
 *
 * This creates a fake request to use to get a scoped client.
 * @param basePath The base path to use
 * @returns A fake request
 */
export const getFakeKibanaRequest = (basePath: string): KibanaRequest => {
  const requestHeaders: Record<string, string> = {};
  return ({
    headers: requestHeaders,
    getBasePath: () => basePath,
    path: '/',
    route: { settings: {} },
    url: {
      href: '/',
    },
    raw: {
      req: {
        url: '/',
      },
    },
  } as unknown) as KibanaRequest;
};
