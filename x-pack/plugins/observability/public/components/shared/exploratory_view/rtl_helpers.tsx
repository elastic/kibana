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
import {
  render as reactTestLibRender,
  RenderOptions,
  MatcherFunction,
} from '@testing-library/react';
import { Router } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { createMemoryHistory, History } from 'history';
import { CoreStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock, themeServiceMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider, KibanaServices } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { setIndexPatterns } from '@kbn/unified-search-plugin/public/services';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { DataViewSpec } from '@kbn/data-views-plugin/public';
import { rumFieldFormats } from './configurations/rum/field_formats';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import * as useAppDataViewHook from './hooks/use_app_data_view';
import { DataViewContext, DataViewContextProvider } from './hooks/use_app_data_view';
import {
  AllSeries,
  reportTypeKey,
  SeriesContextValue,
  UrlStorageContext,
} from './hooks/use_series_storage';

import * as fetcherHook from '../../../hooks/use_fetcher';
import * as useSeriesFilterHook from './hooks/use_series_filters';
import * as useHasDataHook from '../../../hooks/use_has_data';
import * as useValuesListHook from '../../../hooks/use_values_list';

import dataViewData from './configurations/test_data/test_data_view.json';

import { AppDataType, SeriesUrl, UrlFilter } from './types';
import { ListItem } from '../../../hooks/use_values_list';
import { TRANSACTION_DURATION } from './configurations/constants/elasticsearch_fieldnames';
import { dataTypes, obsvReportConfigMap, reportTypesList } from './obsv_exploratory_view';
import { ExploratoryViewContextProvider } from './contexts/exploratory_view_config';

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
    dataViews: dataViewPluginMocks.createStartContract(),
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
  const dataView = mockDataView;
  setIndexPatterns({
    ...[dataView],
    get: async () => dataView,
  } as unknown as DataViewsContract);

  return (
    <KibanaContextProvider services={{ ...core }} {...kibanaProps}>
      <EuiThemeProvider darkMode={false}>
        <I18nProvider>
          <DataViewContextProvider>{children}</DataViewContextProvider>
        </I18nProvider>
      </EuiThemeProvider>
    </KibanaContextProvider>
  );
}

export function MockRouter<ExtraCore extends Partial<CoreStart>>({
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
): any {
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
        <ExploratoryViewContextProvider
          reportTypes={reportTypesList}
          dataTypes={dataTypes}
          reportConfigMap={obsvReportConfigMap}
          setHeaderActionMenu={jest.fn()}
          theme$={themeServiceMock.createTheme$()}
        >
          <UrlStorageContext.Provider value={{ ...seriesContextValue }}>
            {ui}
          </UrlStorageContext.Provider>
        </ExploratoryViewContextProvider>
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

export const mockAppDataView = (props?: Partial<DataViewContext>) => {
  const loadDataView = jest.fn();
  const spy = jest.spyOn(useAppDataViewHook, 'useAppDataViewContext').mockReturnValue({
    dataView: mockDataView,
    hasData: true,
    loading: false,
    hasAppData: { ux: true } as any,
    loadDataView,
    dataViews: { ux: mockDataView } as unknown as Record<AppDataType, DataView>,
    dataViewErrors: {} as any,
    ...(props || {}),
  });
  return { spy, loadDataView };
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
    setChartTimeRangeContext: jest.fn(),
    storage: {
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key === reportTypeKey ? 'data-distribution' : mockDataSeries
        ),
    } as any,
  } as SeriesContextValue;
}

export function mockUseSeriesFilter() {
  const removeFilter = jest.fn();
  const invertFilter = jest.fn();
  const setFilter = jest.fn();
  const replaceFilter = jest.fn();
  const setFiltersWildcard = jest.fn();
  const spy = jest.spyOn(useSeriesFilterHook, 'useSeriesFilters').mockReturnValue({
    removeFilter,
    invertFilter,
    setFilter,
    replaceFilter,
    setFiltersWildcard,
  });

  return {
    spy,
    removeFilter,
    invertFilter,
    setFilter,
    replaceFilter,
    setFiltersWildcard,
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

const fieldFormatMap: DataViewSpec['fieldFormats'] = {};

rumFieldFormats.forEach(({ field, format }) => {
  fieldFormatMap[field] = format;
});

export const mockDataView = createStubDataView({
  spec: {
    id: 'apm-*',
    title: 'apm-*',
    timeFieldName: '@timestamp',
    fields: JSON.parse(dataViewData.attributes.fields),
    fieldFormats: fieldFormatMap,
  },
});

// This function allows us to query for the nearest button with test
// no matter whether it has nested tags or not (as EuiButton elements do).
export const forNearestButton =
  (getByText: (f: MatcherFunction) => HTMLElement | null) =>
  (text: string): HTMLElement | null =>
    getByText((_content: string, node: Element | null) => {
      if (!node) return false;
      const noOtherButtonHasText = Array.from(node.children).every(
        (child) => child && (child.textContent !== text || child.tagName.toLowerCase() !== 'button')
      );
      return (
        noOtherButtonHasText && node.textContent === text && node.tagName.toLowerCase() === 'button'
      );
    });
