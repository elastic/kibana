/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import type { HttpFetchOptions, HttpHandler, HttpStart } from 'kibana/public';

const BASE_PATH = '';

let isReady = false;

export const getHttp = (basepath = BASE_PATH) => {
  const http: HttpStart = {
    basePath: {
      prepend: (path: string) => {
        if (path.startsWith('/api/fleet/epm/packages/')) {
          return basepath;
        }

        return `${basepath}${path}`;
      },
      get: () => basepath,
      remove: () => basepath,
      serverBasePath: basepath,
    },
    get: (async (path: string, options: HttpFetchOptions) => {
      if (path === '/api/fleet/agents/setup') {
        if (!isReady) {
          isReady = true;
          return { isReady: false, missing_requirements: ['api_keys', 'fleet_server'] };
        }
        return { isInitialized: true, nonFatalErrors: [] };
      }

      if (path === '/api/fleet/epm/categories') {
        return await import('./fixtures/categories');
      }

      if (path === '/api/fleet/epm/packages') {
        const category = options?.query?.category;
        if (category && category !== ':category') {
          action(`CATEGORY QUERY - ${category}`)(
            "KP: CATEGORY ROUTE RELIES ON SAVED_OBJECT API; STORIES DON'T FILTER"
          );
        }

        return await import('./fixtures/packages');
      }

      return {};
    }) as HttpHandler,
  } as unknown as HttpStart;

  return http;
};
