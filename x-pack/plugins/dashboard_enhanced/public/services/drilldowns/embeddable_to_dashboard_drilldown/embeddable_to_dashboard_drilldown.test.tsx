/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, RangeFilter } from '@kbn/es-query';
import { EmbeddableToDashboardDrilldown } from './embeddable_to_dashboard_drilldown';
import { AbstractDashboardDrilldownConfig as Config } from '../abstract_dashboard_drilldown';
import { savedObjectsServiceMock } from '../../../../../../../src/core/public/mocks';
import { FilterStateStore, Query, TimeRange } from '../../../../../../../src/plugins/data/common';
import { ApplyGlobalFilterActionContext } from '../../../../../../../src/plugins/unified_search/public';
import {
  DashboardAppLocatorDefinition,
  DashboardAppLocatorParams,
} from '../../../../../../../src/plugins/dashboard/public/locator';
import { StartDependencies } from '../../../plugin';
import { StartServicesGetter } from '../../../../../../../src/plugins/kibana_utils/public/core';
import { EnhancedEmbeddableContext } from '../../../../../embeddable_enhanced/public';

describe('.isConfigValid()', () => {
  const drilldown = new EmbeddableToDashboardDrilldown({} as any);

  test('returns false for invalid config with missing dashboard id', () => {
    expect(
      drilldown.isConfigValid({
        dashboardId: '',
        useCurrentDateRange: false,
        useCurrentFilters: false,
        openInNewTab: false,
      })
    ).toBe(false);
  });

  test('returns true for valid config', () => {
    expect(
      drilldown.isConfigValid({
        dashboardId: 'id',
        useCurrentDateRange: false,
        useCurrentFilters: false,
        openInNewTab: false,
      })
    ).toBe(true);
  });
});

test('config component exist', () => {
  const drilldown = new EmbeddableToDashboardDrilldown({} as any);
  expect(drilldown.CollectConfig).toEqual(expect.any(Function));
});

test('initial config: switches are ON', () => {
  const drilldown = new EmbeddableToDashboardDrilldown({} as any);
  const { useCurrentDateRange, useCurrentFilters } = drilldown.createConfig();
  expect(useCurrentDateRange).toBe(true);
  expect(useCurrentFilters).toBe(true);
});

test('getHref is defined', () => {
  const drilldown = new EmbeddableToDashboardDrilldown({} as any);
  expect(drilldown.getHref).toBeDefined();
});

test('inject/extract are defined', () => {
  const drilldown = new EmbeddableToDashboardDrilldown({} as any);
  expect(drilldown.extract).toBeDefined();
  expect(drilldown.inject).toBeDefined();
});

describe('.execute() & getHref', () => {
  async function setupTestBed(
    config: Partial<Config>,
    embeddableInput: { filters?: Filter[]; timeRange?: TimeRange; query?: Query },
    filtersFromEvent: Filter[],
    timeFieldName?: string
  ) {
    const navigateToApp = jest.fn();
    const getUrlForApp = jest.fn((app, opt) => `${app}/${opt.path}`);
    const savedObjectsClient = savedObjectsServiceMock.createStartContract().client;
    const definition = new DashboardAppLocatorDefinition({
      useHashedUrl: false,
      getDashboardFilterFields: async () => [],
    });
    const getLocationSpy = jest.spyOn(definition, 'getLocation');
    const drilldown = new EmbeddableToDashboardDrilldown({
      start: (() => ({
        core: {
          application: {
            navigateToApp,
            getUrlForApp,
          },
          savedObjects: {
            client: savedObjectsClient,
          },
        },
        plugins: {
          uiActionsEnhanced: {},
          dashboard: {
            locator: {
              getLocation: async (params: DashboardAppLocatorParams) => {
                return await definition.getLocation(params);
              },
            },
          },
        },
        self: {},
      })) as unknown as StartServicesGetter<
        Pick<StartDependencies, 'data' | 'uiActionsEnhanced' | 'dashboard'>
      >,
    });

    const completeConfig: Config = {
      dashboardId: 'id',
      useCurrentFilters: false,
      useCurrentDateRange: false,
      openInNewTab: false,
      ...config,
    };

    const context = {
      filters: filtersFromEvent,
      embeddable: {
        getInput: () => ({
          filters: [],
          timeRange: { from: 'now-15m', to: 'now' },
          query: { query: 'test', language: 'kuery' },
          ...embeddableInput,
        }),
      },
      timeFieldName,
    } as unknown as ApplyGlobalFilterActionContext & EnhancedEmbeddableContext;

    await drilldown.execute(completeConfig, context);

    expect(navigateToApp).toBeCalledTimes(1);
    expect(navigateToApp.mock.calls[0][0]).toBe('dashboards');

    const executeNavigatedPath = navigateToApp.mock.calls[0][1]?.path;
    const href = await drilldown.getHref(completeConfig, context);

    expect(href.includes(executeNavigatedPath)).toBe(true);

    return {
      href,
      getLocationSpy,
    };
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('navigates to correct dashboard', async () => {
    const testDashboardId = 'dashboardId';
    const { href } = await setupTestBed(
      {
        dashboardId: testDashboardId,
      },
      {},
      []
    );

    expect(href).toEqual(expect.stringContaining(`view/${testDashboardId}`));
  });

  test('query is removed if filters are disabled', async () => {
    const queryString = 'querystring';
    const queryLanguage = 'kuery';
    const { href } = await setupTestBed(
      {
        useCurrentFilters: false,
      },
      {
        query: { query: queryString, language: queryLanguage },
      },
      []
    );

    expect(href).toEqual(expect.not.stringContaining(queryString));
    expect(href).toEqual(expect.not.stringContaining(queryLanguage));
  });

  test('navigates with query if filters are enabled', async () => {
    const queryString = 'querystring';
    const queryLanguage = 'kuery';
    const { getLocationSpy } = await setupTestBed(
      {
        useCurrentFilters: true,
      },
      {
        query: { query: queryString, language: queryLanguage },
      },
      []
    );

    const {
      state: { query },
    } = await getLocationSpy.mock.results[0].value;

    expect(query.query).toBe(queryString);
    expect(query.language).toBe(queryLanguage);
  });

  test('when user chooses to keep current filters, current filters are set on destination dashboard', async () => {
    const existingAppFilterKey = 'appExistingFilter';
    const existingGlobalFilterKey = 'existingGlobalFilter';
    const newAppliedFilterKey = 'newAppliedFilter';

    const { getLocationSpy } = await setupTestBed(
      {
        useCurrentFilters: true,
      },
      {
        filters: [getFilter(false, existingAppFilterKey), getFilter(true, existingGlobalFilterKey)],
      },
      [getFilter(false, newAppliedFilterKey)]
    );

    const {
      state: { filters },
    } = await getLocationSpy.mock.results[0].value;

    expect(filters.length).toBe(3);

    const filtersString = JSON.stringify(filters);
    expect(filtersString).toEqual(expect.stringContaining(existingAppFilterKey));
    expect(filtersString).toEqual(expect.stringContaining(existingGlobalFilterKey));
    expect(filtersString).toEqual(expect.stringContaining(newAppliedFilterKey));
  });

  test('when user chooses to remove current filters, current app filters are remove on destination dashboard', async () => {
    const existingAppFilterKey = 'appExistingFilter';
    const existingGlobalFilterKey = 'existingGlobalFilter';
    const newAppliedFilterKey = 'newAppliedFilter';

    const { getLocationSpy } = await setupTestBed(
      {
        useCurrentFilters: false,
      },
      {
        filters: [getFilter(false, existingAppFilterKey), getFilter(true, existingGlobalFilterKey)],
      },
      [getFilter(false, newAppliedFilterKey)]
    );

    const {
      state: { filters },
    } = await getLocationSpy.mock.results[0].value;

    expect(filters.length).toBe(2);

    const filtersString = JSON.stringify(filters);
    expect(filtersString).not.toEqual(expect.stringContaining(existingAppFilterKey));
    expect(filtersString).toEqual(expect.stringContaining(existingGlobalFilterKey));
    expect(filtersString).toEqual(expect.stringContaining(newAppliedFilterKey));
  });

  test('when user chooses to keep current time range, current time range is passed in url', async () => {
    const { href } = await setupTestBed(
      {
        useCurrentDateRange: true,
      },
      {
        timeRange: {
          from: 'now-300m',
          to: 'now',
        },
      },
      []
    );

    expect(href).toEqual(expect.stringContaining('now-300m'));
  });

  test('when user chooses to not keep current time range, no current time range is passed in url', async () => {
    const { href } = await setupTestBed(
      {
        useCurrentDateRange: false,
      },
      {
        timeRange: {
          from: 'now-300m',
          to: 'now',
        },
      },
      []
    );

    expect(href).not.toEqual(expect.stringContaining('now-300m'));
  });

  test('if range filter contains date, then it is passed as time', async () => {
    const { href } = await setupTestBed(
      {
        useCurrentDateRange: true,
      },
      {
        timeRange: {
          from: 'now-300m',
          to: 'now',
        },
      },
      [getMockTimeRangeFilter()],
      getMockTimeRangeFilter().meta.key
    );

    expect(href).not.toEqual(expect.stringContaining('now-300m'));
    expect(href).toEqual(expect.stringContaining('2020-03-23'));
  });
});

function getFilter(isPinned: boolean, queryKey: string): Filter {
  return {
    $state: {
      store: isPinned ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE,
    },
    meta: {
      index: 'logstash-*',
      disabled: false,
      negate: false,
      alias: null,
    },
    query: {
      match: {
        [queryKey]: 'any',
      },
    },
  };
}

function getMockTimeRangeFilter(): RangeFilter {
  return {
    meta: {
      index: 'logstash-*',
      params: {
        gte: '2020-03-23T13:10:29.665Z',
        lt: '2020-03-23T13:10:36.736Z',
        format: 'strict_date_optional_time',
      },
      type: 'range',
      key: 'order_date',
      disabled: false,
      negate: false,
      alias: null,
    },
    query: {
      range: {
        order_date: {
          gte: '2020-03-23T13:10:29.665Z',
          lt: '2020-03-23T13:10:36.736Z',
          format: 'strict_date_optional_time',
        },
      },
    },
  };
}
