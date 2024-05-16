/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupServer } from 'msw/node';
import { coreMock } from '@kbn/core/public/mocks';
import type { CoreStart } from '@kbn/core/public';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import { indexPatternFieldEditorPluginMock as dataViewFieldEditorMock } from '@kbn/data-view-field-editor-plugin/public/mocks';
import SearchBar from '@kbn/unified-search-plugin/public/search_bar/search_bar';
import { defaultHandlers } from './handlers';
import { getMockDependencies } from './fixtures/get_mock_dependencies';
import { CspClientPluginStartDeps } from '../types';

export function setupMockServiceWorker(debug = false) {
  const server = setupServer(...defaultHandlers);

  if (debug) {
    // Debug: log all requests to the console
    server.events.on('request:start', ({ request }) => {
      // eslint-disable-next-line no-console
      console.log('MSW intercepted:', request.method, request.url);
    });
  }
  return server;
}

export const getMockServerServicesSetup = () => {
  return {
    deps: {
      ...getMockDependencies(),
      data: {
        ...getMockDependencies().data,
        search: {
          ...getMockDependencies().data.search,
          search: async ({ params }: { params: any }) => {
            const response = await fetch('http://localhost/internal/bsearch', {
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
              `http://localhost/internal/data_views/fields?pattern=${pattern}`
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
        },
      },
      licensing: {
        ...getMockDependencies().licensing,
        refresh: async () => {
          const response = await fetch('http://localhost/api/licensing/info');
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
    } as unknown as Partial<CspClientPluginStartDeps>,
    core: {
      ...coreMock.createStart(),
      http: {
        ...coreMock.createStart().http,
        get: async (path: string, options: any) => {
          const response = await fetch(`http://localhost${path}`, options);
          return response.json();
        },
      },
    } as unknown as CoreStart,
  };
};
