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
import { Router } from 'react-router-dom';
import { createMemoryHistory, History } from 'history';
import { CoreStart } from 'kibana/public';
import { I18nProvider } from '@kbn/i18n/react';
import { coreMock } from 'src/core/public/mocks';
import {
  KibanaServices,
  KibanaContextProvider,
} from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { lensPluginMock } from '../../../../../lens/public/mocks';
import { IndexPatternContextProvider } from './hooks/use_app_index_pattern';
import { AllSeries, UrlStorageContextProvider } from './hooks/use_url_storage';
import {
  withNotifyOnErrors,
  createKbnUrlStateStorage,
} from '../../../../../../../src/plugins/kibana_utils/public';
import * as fetcherHook from '../../../hooks/use_fetcher';
import * as useUrlHook from './hooks/use_url_storage';
import * as useSeriesFilterHook from './hooks/use_series_filters';
import * as useHasDataHook from '../../../hooks/use_has_data';
import * as useValuesListHook from '../../../hooks/use_values_list';
import * as useAppIndexPatternHook from './hooks/use_app_index_pattern';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getStubIndexPattern } from '../../../../../../../src/plugins/data/public/index_patterns/index_pattern.stub';
import indexPatternData from './configurations/test_data/test_index_pattern.json';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { setIndexPatterns } from '../../../../../../../src/plugins/data/public/services';
import { IndexPatternsContract } from '../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { UrlFilter } from './types';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';

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
}

function getSetting<T = any>(key: string): T {
  if (key === 'timepicker:quickRanges') {
    return ([
      {
        display: 'Today',
        from: 'now/d',
        to: 'now/d',
      },
    ] as unknown) as T;
  }
  return ('MMM D, YYYY @ HH:mm:ss.SSS' as unknown) as T;
}

function setSetting$<T = any>(key: string): T {
  return (of('MMM D, YYYY @ HH:mm:ss.SSS') as unknown) as T;
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
  };

  return core;
};

/* Mock Provider Components */
export function MockKibanaProvider<ExtraCore extends Partial<CoreStart>>({
  children,
  core,
  history,
  kibanaProps,
}: MockKibanaProviderProps<ExtraCore>) {
  const { notifications } = core!;

  const kbnUrlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: false,
    ...withNotifyOnErrors(notifications!.toasts),
  });

  const indexPattern = mockIndexPattern;

  setIndexPatterns(({
    ...[indexPattern],
    get: async () => indexPattern,
  } as unknown) as IndexPatternsContract);

  return (
    <KibanaContextProvider services={{ ...core }} {...kibanaProps}>
      <EuiThemeProvider darkMode={false}>
        <I18nProvider>
          <IndexPatternContextProvider>
            <UrlStorageContextProvider storage={kbnUrlStateStorage}>
              {children}
            </UrlStorageContextProvider>
          </IndexPatternContextProvider>
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
      <MockKibanaProvider core={core} kibanaProps={kibanaProps} history={history}>
        {children}
      </MockKibanaProvider>
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
    url,
  }: RenderRouterOptions<ExtraCore> = {}
) {
  if (url) {
    history = getHistoryFromUrl(url);
  }

  const core = {
    ...mockCore(),
    ...customCore,
  };

  return {
    ...reactTestLibRender(
      <MockRouter history={history} kibanaProps={kibanaProps} core={core}>
        {ui}
      </MockRouter>,
      renderOptions
    ),
    history,
    core,
  };
}

const getHistoryFromUrl = (url: Url) => {
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
    selectedApp: 'ux',
    hasData: true,
    loading: false,
    hasAppData: { ux: true } as any,
    loadIndexPattern,
  });
  return { spy, loadIndexPattern };
};

export const mockUseValuesList = (values?: string[]) => {
  const onRefreshTimeRange = jest.fn();
  const spy = jest.spyOn(useValuesListHook, 'useValuesList').mockReturnValue({
    values: values ?? [],
  } as any);
  return { spy, onRefreshTimeRange };
};

export const mockUrlStorage = ({
  data,
  filters,
  breakdown,
}: {
  data?: AllSeries;
  filters?: UrlFilter[];
  breakdown?: string;
}) => {
  const mockDataSeries = data || {
    'performance-distribution': {
      reportType: 'pld',
      dataType: 'ux',
      breakdown: breakdown || 'user_agent.name',
      time: { from: 'now-15m', to: 'now' },
      ...(filters ? { filters } : {}),
    },
  };
  const allSeriesIds = Object.keys(mockDataSeries);
  const firstSeriesId = allSeriesIds?.[0];

  const series = mockDataSeries[firstSeriesId];

  const removeSeries = jest.fn();
  const setSeries = jest.fn();

  const spy = jest.spyOn(useUrlHook, 'useUrlStorage').mockReturnValue({
    firstSeriesId,
    allSeriesIds,
    removeSeries,
    setSeries,
    series,
    firstSeries: mockDataSeries[firstSeriesId],
    allSeries: mockDataSeries,
  } as any);

  return { spy, removeSeries, setSeries };
};

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

export const mockIndexPattern = getStubIndexPattern(
  'apm-*',
  () => {},
  '@timestamp',
  JSON.parse(indexPatternData.attributes.fields),
  mockCore() as any
);
