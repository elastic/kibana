/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup, CustomRequestHandlerContext } from '@kbn/core/server';

import type {
  PluginStart as DataPluginStart,
  PluginSetup as DataPluginSetup,
  IScopedSearchClient,
} from '@kbn/data-plugin/server';

import type { IEsSearchResponse, ISearchRequestParams } from '@kbn/data-plugin/common';
import { lastValueFrom } from 'rxjs';

export interface ExampleDataAccessPluginSetupDependencies {
  data: DataPluginSetup;
}

export interface ExampleDataAccessPluginStartDependencies {
  data: DataPluginStart;
}

export interface ExampleDataAccessPluginSetupContract {}

export interface ExampleDataAccessPluginStartContract {}

export type ExampleDataAccessPluginRequestHandlerContext = CustomRequestHandlerContext<{
  example: {
    getScopedDataClient: () => Promise<IScopedSearchClient>;
    basicDataClientSearch: <T>(params: ISearchRequestParams) => Promise<IEsSearchResponse<T>>;
  };
}>;

const API_BASE = '/api/example-data-access';

const BASIC_QUERY = {
  index: 'metrics-*',
  body: {
    query: {
      range: {
        '@timestamp': {
          gte: 'now-15m',
        },
      },
    },
  },
};

export class ExampleDataAccessPlugin
  implements
    Plugin<
      ExampleDataAccessPluginSetupContract,
      ExampleDataAccessPluginStartContract,
      ExampleDataAccessPluginSetupDependencies,
      ExampleDataAccessPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<ExampleDataAccessPluginStartDependencies, ExampleDataAccessPluginStartContract>,
    plugins: ExampleDataAccessPluginSetupDependencies
  ): ExampleDataAccessPluginSetupContract {
    // ROUTES
    const router = core.http.createRouter<ExampleDataAccessPluginRequestHandlerContext>();

    core.http.registerRouteHandlerContext<ExampleDataAccessPluginRequestHandlerContext, 'example'>(
      'example',
      (context, request) => {
        async function getScopedDataClient() {
          const [, plugins] = await core.getStartServices();
          return plugins.data.search.asScoped(request);
        }
        return {
          getScopedDataClient,
          basicDataClientSearch: async <T = any>(params: ISearchRequestParams) => {
            const client = await getScopedDataClient();
            return lastValueFrom<IEsSearchResponse<T>>(
              client.search<any, IEsSearchResponse<T>>({ params })
            );
          },
        };
      }
    );

    router.get(
      {
        path: `${API_BASE}/basic-observable`,
        validate: {},
      },
      async (context, request, response) => {
        const client = await (await context.example).getScopedDataClient();
        client
          .search({
            params: BASIC_QUERY,
          })
          .subscribe({
            next: (result) => {
              if (result.isPartial) {
                console.log('Partial result received', result);
              } else {
                console.log('Full result received', result);
              }
            },
            error: (e) => {
              console.log('An error occurred while waiting for results', e);
            },
          });

        return response.ok({
          body: {
            message: 'Results will be printed to console for this route',
          },
        });
      }
    );

    router.get(
      {
        path: `${API_BASE}/basic-promise`,
        validate: {},
      },
      async (context, request, response) => {
        try {
          const result = await (await context.example).basicDataClientSearch<any>(BASIC_QUERY);
          return response.ok({
            body: {
              message: result.rawResponse,
            },
          });
        } catch (error) {
          return response.customError({
            statusCode: 500,
            body: {
              message: error.message || 'An unknown error occurred',
            },
          });
        }
      }
    );

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
