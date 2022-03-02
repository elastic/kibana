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
      action('get')(path, options);
      // TODO: all of this needs revision, as it's far too clunky... but it works for now,
      // with the few paths we're supporting.
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

      // Ideally, this would be a markdown file instead of a ts file, but we don't have
      // markdown-loader in our package.json, so we'll make do with what we have.
      if (path.match('/api/fleet/epm/packages/nginx/.*/.*/')) {
        const { readme } = await import('./fixtures/readme.nginx');
        return readme;
      }

      if (path.startsWith('/api/fleet/epm/packages/nginx')) {
        return await import('./fixtures/integration.nginx');
      }

      // Ideally, this would be a markdown file instead of a ts file, but we don't have
      // markdown-loader in our package.json, so we'll make do with what we have.
      if (path.match('/api/fleet/epm/packages/okta/.*/.*/')) {
        const { readme } = await import('./fixtures/readme.okta');
        return readme;
      }

      if (path.startsWith('/api/fleet/epm/packages/okta')) {
        return await import('./fixtures/integration.okta');
      }

      if (path.startsWith('/api/fleet/check-permissions')) {
        return { success: true };
      }

      action(path)('KP: UNSUPPORTED ROUTE');
      return {};
    }) as HttpHandler,
  } as unknown as HttpStart;

  return http;
};
