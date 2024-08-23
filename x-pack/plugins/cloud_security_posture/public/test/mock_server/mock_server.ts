/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupServer, SetupServerApi } from 'msw/node';
import { coreMock } from '@kbn/core/public/mocks';
import type { CoreStart } from '@kbn/core/public';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import { indexPatternFieldEditorPluginMock as dataViewFieldEditorMock } from '@kbn/data-view-field-editor-plugin/public/mocks';
import SearchBar from '@kbn/unified-search-plugin/public/search_bar/search_bar';
import { http, HttpResponse, JsonBodyType } from 'msw';
import { defaultHandlers } from './handlers';
import { getMockDependencies } from '../fixtures/get_mock_dependencies';
import { CspClientPluginStartDeps } from '../../types';
import { MOCK_SERVER_LICENSING_INFO_URL } from './handlers/licensing.handlers.mock';

/**
 * Mock the lastValueFrom function from rxjs to return the result of the promise instead of the Observable
 * This is for simplifying the testing by avoiding the need to subscribe to the Observable while producing the same result
 */
jest.mock('rxjs', () => {
  const actual = jest.requireActual('rxjs');
  return {
    ...actual,
    lastValueFrom: async (source: Promise<any>) => {
      const value = await source;
      return value.result;
    },
  };
});

// Set the default timeout for all mock server tests to 30 seconds
jest.setTimeout(10 * 3000);

/**
 * Setup a mock server with the default handlers
 * @param debug - If true, log all requests to the console
 * @returns The mock server
 */
export const setupMockServer = ({ debug = false }: { debug?: boolean } = {}) => {
  const server = setupServer(...defaultHandlers);

  if (debug) {
    // Debug: log all requests to the console
    server.events.on('request:start', async ({ request }) => {
      const payload = await request.clone().text();
      // eslint-disable-next-line no-console
      console.log('MSW intercepted request:', request.method, request.url, payload);
    });
    server.events.on('response:mocked', async ({ request, response }) => {
      const body = await response.json();
      // eslint-disable-next-line no-console
      console.log(
        '%s %s received %s %s %s',
        request.method,
        request.url,
        response.status,
        response.statusText,
        JSON.stringify(body, null, 2)
      );
    });
  }
  return server;
};

/**
 * This function wraps beforeAll, afterAll and beforeEach for setup MSW server into a single call.
 * That makes the describe code further down easier to read and makes
 * sure we don't forget the handlers. Can easily be shared between tests.
 * @param server - The MSW server instance, created with setupMockServer
 */
export const startMockServer = (server: SetupServerApi) => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterAll(() => server.close());
  beforeEach(() => {
    server.resetHandlers();
  });
};

const MOCK_SERVER_BASE_URL = 'http://localhost';

/**
 * Get a set of dependencies for the mock server overriding default mock dependencies to perform
 * HTTP calls that will be intercepted by the mock server
 * @returns The core and deps dependencies used by the KibanaContextProvider
 */
export const getMockServerDependencies = () => {
  return {
    deps: {
      ...getMockDependencies(),
      data: {
        ...getMockDependencies().data,
        search: {
          ...getMockDependencies().data.search,
          search: async ({ params }: { params: any }) => {
            const response = await fetch(`${MOCK_SERVER_BASE_URL}/internal/bsearch`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(params),
            });
            return response.json();
          },
        },
        dataViews: {
          ...getMockDependencies().data.dataViews,
          find: async (pattern: string) => {
            const response = await fetch(
              `${MOCK_SERVER_BASE_URL}/internal/data_views/fields?pattern=${pattern}`
            );

            const responseJson = await response.json();

            const fields = responseJson.fields.reduce((acc: any, field: any) => {
              acc[field.name] = field;
              return acc;
            }, {});

            const dataView = createStubDataView({
              spec: {
                id: pattern,
                title: pattern,
                fields,
              },
            });

            return [dataView];
          },
          get: async (id: string) => {
            const response = await fetch(`${MOCK_SERVER_BASE_URL}/internal/data_views/?id=${id}`);

            const responseJson = await response.json();

            const fields = responseJson.fields.reduce((acc: any, field: any) => {
              acc[field.name] = field;
              return acc;
            }, {});

            const dataView = createStubDataView({
              spec: {
                id,
                title: responseJson.indices[0],
                fields,
              },
            });

            return dataView;
          },
        },
      },
      licensing: {
        ...getMockDependencies().licensing,
        refresh: async () => {
          const response = await fetch(MOCK_SERVER_LICENSING_INFO_URL);
          const responseJson = await response.json();
          return licenseMock.createLicense(responseJson);
        },
      },
      dataViewFieldEditor: dataViewFieldEditorMock.createStartContract(),
      unifiedSearch: {
        ...getMockDependencies().unifiedSearch,
        ui: {
          ...getMockDependencies().unifiedSearch.ui,
          SearchBar,
        },
      },
      storage: {
        ...getMockDependencies().storage,
        get: (key: string) => {
          return localStorage.getItem(key);
        },
        set: (key: string, value: string) => {
          localStorage.setItem(key, value);
        },
      },
    } as unknown as Partial<CspClientPluginStartDeps>,
    core: {
      ...coreMock.createStart(),
      http: {
        ...coreMock.createStart().http,
        get: async (path: string, options: any) => {
          const response = await fetch(`${MOCK_SERVER_BASE_URL}${path}`, options);
          return response.json();
        },
      },
    } as unknown as CoreStart,
  };
};

export const mockGetRequest = (path: string, response: JsonBodyType) => {
  return http.get(path, () => HttpResponse.json(response));
};
