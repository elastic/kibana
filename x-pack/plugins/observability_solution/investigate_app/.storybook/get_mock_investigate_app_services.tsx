/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { DataView } from '@kbn/data-views-plugin/common';
import { coreMock } from '@kbn/core/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { SearchBar, IUnifiedSearchPluginServices } from '@kbn/unified-search-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { merge } from 'lodash';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { EsqlQueryMeta } from '../public/services/esql';
import type { InvestigateAppServices } from '../public/services/types';
import { InvestigateAppKibanaContext } from '../public/hooks/use_kibana';

export function getMockInvestigateAppContext(): DeeplyMockedKeys<InvestigateAppKibanaContext> {
  const services: DeeplyMockedKeys<InvestigateAppServices> = {
    esql: {
      meta: jest.fn().mockImplementation((): Promise<EsqlQueryMeta> => {
        return Promise.resolve({
          suggestions: [],
          columns: [],
          dataView: {} as DataView,
        });
      }),
      query: jest.fn().mockImplementation((): Promise<ESQLSearchResponse> => {
        return Promise.resolve({
          values: [],
          columns: [],
        });
      }),
      queryWithMeta: jest
        .fn()
        .mockImplementation((): Promise<{ meta: EsqlQueryMeta; query: ESQLSearchResponse }> => {
          return Promise.resolve({
            meta: {
              suggestions: [],
              columns: [],
              dataView: {} as DataView,
            },
            query: {
              values: [],
              columns: [],
            },
          });
        }),
    },
  };

  const core = coreMock.createStart();

  const dataMock = merge({}, dataPluginMock.createStartContract(), {
    query: {
      savedQueries: {},
      timefilter: {
        timefilter: {
          getTime: () => ({ from: 'now-15m', to: 'now', mode: 'relative' }),
        },
      },
    },
  });

  return {
    core: core as any,
    dependencies: {
      start: {
        data: dataMock,
        unifiedSearch: merge({}, unifiedSearchPluginMock.createStartContract(), {
          ui: {
            SearchBar: function SearchBarWithContext(props: {}) {
              const unifiedSearchServices = useMemo(() => {
                return {
                  data: dataMock,
                  storage: new Storage(window.localStorage),
                  uiSettings: core.uiSettings,
                } as unknown as IUnifiedSearchPluginServices;
              }, []);
              return (
                <KibanaContextProvider services={unifiedSearchServices}>
                  <SearchBar {...props} />
                </KibanaContextProvider>
              );
            },
          },
        }),
        embeddable: merge({}, embeddablePluginMock.createStartContract(), {
          getEmbeddableFactories: () => [
            {
              canCreateNew: () => true,
              getDisplayName: () => 'Alerts',
              type: 'alerts',
            },
          ],
        }),
        investigate: {},
        lens: {},
        observabilityShared: {},
        dataViews: dataViewPluginMocks.createStartContract(),
      },
    } as any,
    services,
  };
}
