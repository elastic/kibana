/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import React, { ReactElement } from 'react';
import { stringify } from 'query-string';
// eslint-disable-next-line import/no-extraneous-dependencies
import { render as reactTestLibRender, RenderOptions } from '@testing-library/react';
import { Route, Router } from 'react-router-dom';
import { createMemoryHistory, History } from 'history';
import { CoreStart } from 'kibana/public';
import { I18nProvider } from '@kbn/i18n/react';
import { coreMock } from 'src/core/public/mocks';
import {
  KibanaContextProvider,
  KibanaServices,
} from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { lensPluginMock } from '../../../../../lens/public/mocks';
import * as useAppIndexPatternHook from './hooks/use_app_index_pattern';
import { IndexPatternContextProvider } from './hooks/use_app_index_pattern';
import { AllSeries, SeriesContextValue, UrlStorageContext } from './hooks/use_series_storage';

import * as fetcherHook from '../../../hooks/use_fetcher';
import * as useSeriesFilterHook from './hooks/use_series_filters';
import * as useHasDataHook from '../../../hooks/use_has_data';
import * as useValuesListHook from '../../../hooks/use_values_list';

import indexPatternData from './configurations/test_data/test_index_pattern.json';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { setIndexPatterns } from '../../../../../../../src/plugins/data/public/services';
import { IndexPattern, IndexPatternsContract } from '../../../../../../../src/plugins/data/common';

import { AppDataType, SeriesUrl, UrlFilter } from './types';
import { createStubIndexPattern } from '../../../../../../../src/plugins/data/common/stubs';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { ListItem } from '../../../hooks/use_values_list';
import { TRANSACTION_DURATION } from './configurations/constants/elasticsearch_fieldnames';
import { casesPluginMock } from '../../../../../cases/public/mocks';

interface KibanaProps {
  services?: KibanaServices;
}

export interface KibanaProviderOptions<ExtraCore> {
  core?: ExtraCore & Partial<CoreStart>;
  kibanaProps?: KibanaProps;
}

interface MockKibanaProviderProps<ExtraCore extends Partial<CoreStart>>
  extends KibanaProviderOptions<ExtraCore> {
  children: ReactElement;
  history: History;
}

type MockRouterProps<ExtraCore extends Partial<CoreStart>> = MockKibanaProviderProps<ExtraCore>;

type Url =
  | string
  | {
      path: string;
      queryParams: Record<string, string | number>;
    };

interface RenderRouterOptions<ExtraCore> extends KibanaProviderOptions<ExtraCore> {
  history?: History;
  renderOptions?: Omit<RenderOptions, 'queries'>;
  url?: Url;
  initSeries?: {
    data?: AllSeries;
    filters?: UrlFilter[];
    breakdown?: string;
  };
}

function getSetting<T = any>(key: string): T {
  if (key === 'timepicker:quickRanges') {
    return [
      {
        display: 'Today',
        from: 'now/d',
        to: 'now/d',
      },
    ] as unknown as T;
  }
  return 'MMM D, YYYY @ HH:mm:ss.SSS' as unknown as T;
}

function setSetting$<T = any>(key: string): T {
  return of('MMM D, YYYY @ HH:mm:ss.SSS') as unknown as T;
}

/* default mock core */
const defaultCore = coreMock.createStart();
export const mockCore: () => Partial<CoreStart & ObservabilityPublicPluginsStart> = () => {
  const core: Partial<CoreStart & ObservabilityPublicPluginsStart> = {
    ...defaultCore,
    application: {
      ...defaultCore.application,
      getUrlForApp: () => '/app/observability',
      navigateToUrl: jest.fn(),
      capabilities: {
        ...defaultCore.application.capabilities,
        observability: {
          'alerting:save': true,
          configureSettings: true,
          save: true,
          show: true,
        },
      },
    },
    uiSettings: {
      ...defaultCore.uiSettings,
      get: getSetting,
      get$: setSetting$,
    },
    lens: lensPluginMock.createStartContract(),
    data: dataPluginMock.createStartContract(),
    cases: casesPluginMock.createStartContract(),
  };

  return core;
};

/* Mock Provider Components */
export function MockKibanaProvider<ExtraCore extends Partial<CoreStart>>({
  children,
  core,
  kibanaProps,
}: MockKibanaProviderProps<ExtraCore>) {
  const indexPattern = mockIndexPattern;

  setIndexPatterns({
    ...[indexPattern],
    get: async () => indexPattern,
  } as unknown as IndexPatternsContract);

  return (
    <KibanaContextProvider services={{ ...core }} {...kibanaProps}>
      <EuiThemeProvider darkMode={false}>
        <I18nProvider>
          <IndexPatternContextProvider>{children}</IndexPatternContextProvider>
        </I18nProvider>
      </EuiThemeProvider>
    </KibanaContextProvider>
  );
}

export function MockRouter<ExtraCore>({
  children,
  core,
  history = createMemoryHistory(),
  kibanaProps,
}: MockRouterProps<ExtraCore>) {
  return (
    <Router history={history}>
      <Route path={'/app/observability/exploratory-view/'}>
        <MockKibanaProvider core={core} kibanaProps={kibanaProps} history={history}>
          {children}
        </MockKibanaProvider>
      </Route>
    </Router>
  );
}

/* Custom react testing library render */
export function render<ExtraCore>(
  ui: ReactElement,
  {
    history = createMemoryHistory(),
    core: customCore,
    kibanaProps,
    renderOptions,
    url = '/app/observability/exploratory-view/',
    initSeries = {},
  }: RenderRouterOptions<ExtraCore> = {}
) {
  if (url) {
    history = getHistoryFromUrl(url);
  }

  const core = {
    ...mockCore(),
    ...customCore,
  };

  const seriesContextValue = mockSeriesStorageContext(initSeries);

  return {
    ...reactTestLibRender(
      <MockRouter history={history} kibanaProps={kibanaProps} core={core}>
        <UrlStorageContext.Provider value={{ ...seriesContextValue }}>
          {ui}
        </UrlStorageContext.Provider>
      </MockRouter>,
      renderOptions
    ),
    history,
    core,
    ...seriesContextValue,
  };
}

export const getHistoryFromUrl = (url: Url) => {
  if (typeof url === 'string') {
    return createMemoryHistory({
      initialEntries: [url],
    });
  }

  return createMemoryHistory({
    initialEntries: [url.path + stringify(url.queryParams)],
  });
};

export const mockFetcher = (data: any) => {
  return jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
    data,
    status: fetcherHook.FETCH_STATUS.SUCCESS,
    refetch: jest.fn(),
  });
};

export const mockUseHasData = () => {
  const onRefreshTimeRange = jest.fn();
  const spy = jest.spyOn(useHasDataHook, 'useHasData').mockReturnValue({
    onRefreshTimeRange,
  } as any);
  return { spy, onRefreshTimeRange };
};

export const mockAppIndexPattern = () => {
  const loadIndexPattern = jest.fn();
  const spy = jest.spyOn(useAppIndexPatternHook, 'useAppIndexPatternContext').mockReturnValue({
    indexPattern: mockIndexPattern,
    hasData: true,
    loading: false,
    hasAppData: { ux: true } as any,
    loadIndexPattern,
    indexPatterns: { ux: mockIndexPattern } as unknown as Record<AppDataType, IndexPattern>,
  });
  return { spy, loadIndexPattern };
};

export const mockUseValuesList = (values?: ListItem[]) => {
  const onRefreshTimeRange = jest.fn();
  const spy = jest.spyOn(useValuesListHook, 'useValuesList').mockReturnValue({
    values: values ?? [],
  } as any);
  return { spy, onRefreshTimeRange };
};

export const mockUxSeries = {
  name: 'performance-distribution',
  dataType: 'ux',
  breakdown: 'user_agent.name',
  time: { from: 'now-15m', to: 'now' },
  reportDefinitions: { 'service.name': ['elastic-co'] },
  selectedMetricField: TRANSACTION_DURATION,
} as SeriesUrl;

function mockSeriesStorageContext({
  data,
  filters,
  breakdown,
}: {
  data?: AllSeries;
  filters?: UrlFilter[];
  breakdown?: string;
}) {
  const testSeries = {
    ...mockUxSeries,
    breakdown: breakdown || 'user_agent.name',
    ...(filters ? { filters } : {}),
  };

  const mockDataSeries = data || [testSeries];

  const removeSeries = jest.fn();
  const setSeries = jest.fn();

  const getSeries = jest.fn().mockReturnValue(testSeries);

  return {
    removeSeries,
    setSeries,
    getSeries,
    autoApply: true,
    reportType: 'data-distribution',
    lastRefresh: Date.now(),
    setLastRefresh: jest.fn(),
    setAutoApply: jest.fn(),
    applyChanges: jest.fn(),
    firstSeries: mockDataSeries[0],
    allSeries: mockDataSeries,
    setReportType: jest.fn(),
    storage: { get: jest.fn().mockReturnValue(mockDataSeries) } as any,
  } as SeriesContextValue;
}

export function mockUseSeriesFilter() {
  const removeFilter = jest.fn();
  const invertFilter = jest.fn();
  const setFilter = jest.fn();
  const spy = jest.spyOn(useSeriesFilterHook, 'useSeriesFilters').mockReturnValue({
    removeFilter,
    invertFilter,
    setFilter,
  });

  return {
    spy,
    removeFilter,
    invertFilter,
    setFilter,
  };
}

const hist = createMemoryHistory();
export const mockHistory = {
  ...hist,
  createHref: jest.fn(({ pathname }) => `/observability${pathname}`),
  push: jest.fn(),
  location: {
    ...hist.location,
    pathname: '/current-path',
  },
};

export const mockIndexPattern = createStubIndexPattern({
  spec: {
    id: 'apm-*',
    title: 'apm-*',
    timeFieldName: '@timestamp',
    fields: JSON.parse(indexPatternData.attributes.fields),
  },
});
