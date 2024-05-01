/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupServer } from 'msw/node';
import { coreMock } from '@kbn/core/public/mocks';
import { HttpService } from '@kbn/core-http-browser-internal';
import { ExecutionContextService } from '@kbn/core-execution-context-browser-internal';
import { defaultHandlers } from './handlers';

export function setupMockServiceWorker() {
  const server = setupServer(...defaultHandlers);
  // server.events.on('request:start', ({ request }) => {
  //   console.log('MSW intercepted:', request.method, request.url);
  // });

  return server;
}

export const getMockServerCoreSetup = () => {
  const fatalErrors = coreMock.createSetup().fatalErrors;
  const analytics = coreMock.createSetup().analytics;
  const executionContextService = new ExecutionContextService();
  const executionContextSetup = executionContextService.setup({
    analytics,
  });

  const httpService = new HttpService();
  httpService.setup({
    injectedMetadata: {
      getKibanaBranch: () => 'main',
      getKibanaBuildNumber: () => 123,
      getKibanaVersion: () => '8.0.0',
      getBasePath: () => 'http://localhost',
      getServerBasePath: () => 'http://localhost',
      getPublicBaseUrl: () => 'http://localhost',
      getAssetsHrefBase: () => 'http://localhost',
      getExternalUrlConfig: () => ({
        policy: [],
      }),
    },
    fatalErrors,
    executionContext: executionContextSetup,
  });
  return {
    ...coreMock.createStart(),
    http: httpService.start(),
  };
};
