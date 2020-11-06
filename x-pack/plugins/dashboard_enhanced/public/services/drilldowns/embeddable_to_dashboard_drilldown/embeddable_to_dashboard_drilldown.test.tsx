/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EmbeddableToDashboardDrilldown } from './embeddable_to_dashboard_drilldown';
import { AbstractDashboardDrilldownConfig as Config } from '../abstract_dashboard_drilldown';
import { coreMock, savedObjectsServiceMock } from '../../../../../../../src/core/public/mocks';
import {
  Filter,
  FilterStateStore,
  Query,
  RangeFilter,
  TimeRange,
} from '../../../../../../../src/plugins/data/common';
import {
  ApplyGlobalFilterActionContext,
  esFilters,
} from '../../../../../../../src/plugins/data/public';
import { createDashboardUrlGenerator } from '../../../../../../../src/plugins/dashboard/public/url_generator';
import { UrlGeneratorsService } from '../../../../../../../src/plugins/share/public/url_generators';
import { StartDependencies } from '../../../plugin';
import { SavedObjectLoader } from '../../../../../../../src/plugins/saved_objects/public';
import { StartServicesGetter } from '../../../../../../../src/plugins/kibana_utils/public/core';

describe('.isConfigValid()', () => {
  const drilldown = new EmbeddableToDashboardDrilldown({} as any);

  test('returns false for invalid config with missing dashboard id', () => {
    expect(
      drilldown.isConfigValid({
        dashboardId: '',
        useCurrentDateRange: false,
        useCurrentFilters: false,
      })
    ).toBe(false);
  });

  test('returns true for valid config', () => {
    expect(
      drilldown.isConfigValid({
        dashboardId: 'id',
        useCurrentDateRange: false,
        useCurrentFilters: false,
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
  /**
   * A convenience test setup helper
   * Beware: `dataPluginMock.createStartContract().actions` and extracting filters from event is mocked!
   * The url generation is not mocked and uses real implementation
   * So this tests are mostly focused on making sure the filters returned from `dataPluginMock.createStartContract().actions` helpers
   * end up in resulting navigation path
   */
  async function setupTestBed(
    config: Partial<Config>,
    embeddableInput: { filters?: Filter[]; timeRange?: TimeRange; query?: Query },
    filtersFromEvent: Filter[],
    timeFieldName?: string
  ) {
    const navigateToApp = jest.fn();
    const getUrlForApp = jest.fn((app, opt) => `${app}/${opt.path}`);
    const savedObjectsClient = savedObjectsServiceMock.createStartContract().client;

    const drilldown = new EmbeddableToDashboardDrilldown({
      start: ((() => ({
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
            dashboardUrlGenerator: new UrlGeneratorsService()
              .setup(coreMock.createSetup())
              .registerUrlGenerator(
                createDashboardUrlGenerator(() =>
                  Promise.resolve({
                    appBasePath: 'xyz/app/dashboards',
                    useHashedUrl: false,
                    savedDashboardLoader: ({} as unknown) as SavedObjectLoader,
                  })
                )
              ),
          },
        },
        self: {},
      })) as unknown) as StartServicesGetter<
        Pick<StartDependencies, 'data' | 'uiActionsEnhanced' | 'dashboard'>
      >,
    });

    const completeConfig: Config = {
      dashboardId: 'id',
      useCurrentFilters: false,
      useCurrentDateRange: false,
      ...config,
    };

    const context = ({
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
    } as unknown) as ApplyGlobalFilterActionContext;

    await drilldown.execute(completeConfig, context);

    expect(navigateToApp).toBeCalledTimes(1);
    expect(navigateToApp.mock.calls[0][0]).toBe('dashboards');

    const executeNavigatedPath = navigateToApp.mock.calls[0][1]?.path;
    const href = await drilldown.getHref(completeConfig, context);

    expect(href.includes(executeNavigatedPath)).toBe(true);

    return {
      href,
    };
  }

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
    const { href } = await setupTestBed(
      {
        useCurrentFilters: true,
      },
      {
        query: { query: queryString, language: queryLanguage },
      },
      []
    );

    expect(href).toEqual(expect.stringContaining(queryString));
    expect(href).toEqual(expect.stringContaining(queryLanguage));
  });

  test('when user chooses to keep current filters, current filters are set on destination dashboard', async () => {
    const existingAppFilterKey = 'appExistingFilter';
    const existingGlobalFilterKey = 'existingGlobalFilter';
    const newAppliedFilterKey = 'newAppliedFilter';

    const { href } = await setupTestBed(
      {
        useCurrentFilters: true,
      },
      {
        filters: [getFilter(false, existingAppFilterKey), getFilter(true, existingGlobalFilterKey)],
      },
      [getFilter(false, newAppliedFilterKey)]
    );

    expect(href).toEqual(expect.stringContaining(existingAppFilterKey));
    expect(href).toEqual(expect.stringContaining(existingGlobalFilterKey));
    expect(href).toEqual(expect.stringContaining(newAppliedFilterKey));
  });

  test('when user chooses to remove current filters, current app filters are remove on destination dashboard', async () => {
    const existingAppFilterKey = 'appExistingFilter';
    const existingGlobalFilterKey = 'existingGlobalFilter';
    const newAppliedFilterKey = 'newAppliedFilter';

    const { href } = await setupTestBed(
      {
        useCurrentFilters: false,
      },
      {
        filters: [getFilter(false, existingAppFilterKey), getFilter(true, existingGlobalFilterKey)],
      },
      [getFilter(false, newAppliedFilterKey)]
    );

    expect(href).not.toEqual(expect.stringContaining(existingAppFilterKey));
    expect(href).toEqual(expect.stringContaining(existingGlobalFilterKey));
    expect(href).toEqual(expect.stringContaining(newAppliedFilterKey));
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
      store: isPinned ? esFilters.FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE,
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
    range: {
      order_date: {
        gte: '2020-03-23T13:10:29.665Z',
        lt: '2020-03-23T13:10:36.736Z',
        format: 'strict_date_optional_time',
      },
    },
  };
}
