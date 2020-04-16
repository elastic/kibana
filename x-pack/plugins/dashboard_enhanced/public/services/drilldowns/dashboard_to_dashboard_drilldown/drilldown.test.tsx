/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DashboardToDashboardDrilldown } from './drilldown';
import { UrlGeneratorContract } from '../../../../../../../src/plugins/share/public';
import { savedObjectsServiceMock } from '../../../../../../../src/core/public/mocks';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { ActionContext, Config } from './types';
import {
  Filter,
  FilterStateStore,
  Query,
  RangeFilter,
  TimeRange,
} from '../../../../../../../src/plugins/data/common';
import { esFilters } from '../../../../../../../src/plugins/data/public';

// convenient to use real implementation here.
import { createDirectAccessDashboardLinkGenerator } from '../../../../../../../src/plugins/dashboard/public/url_generator';
import { VisualizeEmbeddableContract } from '../../../../../../../src/plugins/visualizations/public';

describe('.isConfigValid()', () => {
  const drilldown = new DashboardToDashboardDrilldown({} as any);

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
  const drilldown = new DashboardToDashboardDrilldown({} as any);
  expect(drilldown.CollectConfig).toEqual(expect.any(Function));
});

test('initial config: switches are ON', () => {
  const drilldown = new DashboardToDashboardDrilldown({} as any);
  const { useCurrentDateRange, useCurrentFilters } = drilldown.createConfig();
  expect(useCurrentDateRange).toBe(true);
  expect(useCurrentFilters).toBe(true);
});

describe('.execute()', () => {
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
    useRangeEvent = false
  ) {
    const navigateToApp = jest.fn();
    const dataPluginActions = dataPluginMock.createStartContract().actions;
    const savedObjectsClient = savedObjectsServiceMock.createStartContract().client;

    const drilldown = new DashboardToDashboardDrilldown({
      getNavigateToApp: () => Promise.resolve(navigateToApp),
      getGetUrlGenerator: () =>
        Promise.resolve(
          () =>
            createDirectAccessDashboardLinkGenerator(() =>
              Promise.resolve({ appBasePath: 'test', useHashedUrl: false })
            ) as UrlGeneratorContract<string>
        ),
      getDataPluginActions: () => Promise.resolve(dataPluginActions),
      getSavedObjectsClient: () => Promise.resolve(savedObjectsClient),
    });
    const selectRangeFiltersSpy = jest
      .spyOn(dataPluginActions, 'createFiltersFromRangeSelectAction')
      .mockImplementationOnce(() => Promise.resolve(filtersFromEvent));
    const valueClickFiltersSpy = jest
      .spyOn(dataPluginActions, 'createFiltersFromValueClickAction')
      .mockImplementationOnce(() => Promise.resolve(filtersFromEvent));

    await drilldown.execute(
      {
        dashboardId: 'id',
        useCurrentFilters: false,
        useCurrentDateRange: false,
        ...config,
      },
      ({
        data: {
          range: useRangeEvent ? {} : undefined,
        },
        timeFieldName: 'order_date',
        embeddable: {
          getInput: () => ({
            filters: [],
            timeRange: { from: 'now-15m', to: 'now' },
            query: { query: 'test', language: 'kuery' },
            ...embeddableInput,
          }),
        },
      } as unknown) as ActionContext<VisualizeEmbeddableContract>
    );

    if (useRangeEvent) {
      expect(selectRangeFiltersSpy).toBeCalledTimes(1);
      expect(valueClickFiltersSpy).toBeCalledTimes(0);
    } else {
      expect(selectRangeFiltersSpy).toBeCalledTimes(0);
      expect(valueClickFiltersSpy).toBeCalledTimes(1);
    }

    expect(navigateToApp).toBeCalledTimes(1);
    expect(navigateToApp.mock.calls[0][0]).toBe('kibana');

    return {
      navigatedPath: navigateToApp.mock.calls[0][1]?.path,
    };
  }

  test('navigates to correct dashboard', async () => {
    const testDashboardId = 'dashboardId';
    const { navigatedPath } = await setupTestBed(
      {
        dashboardId: testDashboardId,
      },
      {},
      [],
      false
    );

    expect(navigatedPath).toEqual(expect.stringContaining(`dashboard/${testDashboardId}`));
  });

  test('navigates with query', async () => {
    const queryString = 'querystring';
    const queryLanguage = 'kuery';
    const { navigatedPath } = await setupTestBed(
      {},
      {
        query: { query: queryString, language: queryLanguage },
      },
      [],
      true
    );

    expect(navigatedPath).toEqual(expect.stringContaining(queryString));
    expect(navigatedPath).toEqual(expect.stringContaining(queryLanguage));
  });

  test('when user chooses to keep current filters, current filters are set on destination dashboard', async () => {
    const existingAppFilterKey = 'appExistingFilter';
    const existingGlobalFilterKey = 'existingGlobalFilter';
    const newAppliedFilterKey = 'newAppliedFilter';

    const { navigatedPath } = await setupTestBed(
      {
        useCurrentFilters: true,
      },
      {
        filters: [getFilter(false, existingAppFilterKey), getFilter(true, existingGlobalFilterKey)],
      },
      [getFilter(false, newAppliedFilterKey)],
      false
    );

    expect(navigatedPath).toEqual(expect.stringContaining(existingAppFilterKey));
    expect(navigatedPath).toEqual(expect.stringContaining(existingGlobalFilterKey));
    expect(navigatedPath).toEqual(expect.stringContaining(newAppliedFilterKey));
  });

  test('when user chooses to remove current filters, current app filters are remove on destination dashboard', async () => {
    const existingAppFilterKey = 'appExistingFilter';
    const existingGlobalFilterKey = 'existingGlobalFilter';
    const newAppliedFilterKey = 'newAppliedFilter';

    const { navigatedPath } = await setupTestBed(
      {
        useCurrentFilters: false,
      },
      {
        filters: [getFilter(false, existingAppFilterKey), getFilter(true, existingGlobalFilterKey)],
      },
      [getFilter(false, newAppliedFilterKey)],
      false
    );

    expect(navigatedPath).not.toEqual(expect.stringContaining(existingAppFilterKey));
    expect(navigatedPath).toEqual(expect.stringContaining(existingGlobalFilterKey));
    expect(navigatedPath).toEqual(expect.stringContaining(newAppliedFilterKey));
  });

  test('when user chooses to keep current time range, current time range is passed in url', async () => {
    const { navigatedPath } = await setupTestBed(
      {
        useCurrentDateRange: true,
      },
      {
        timeRange: {
          from: 'now-300m',
          to: 'now',
        },
      },
      [],
      false
    );

    expect(navigatedPath).toEqual(expect.stringContaining('now-300m'));
  });

  test('when user chooses to not keep current time range, no current time range is passed in url', async () => {
    const { navigatedPath } = await setupTestBed(
      {
        useCurrentDateRange: false,
      },
      {
        timeRange: {
          from: 'now-300m',
          to: 'now',
        },
      },
      [],
      false
    );

    expect(navigatedPath).not.toEqual(expect.stringContaining('now-300m'));
  });

  test('if range filter contains date, then it is passed as time', async () => {
    const { navigatedPath } = await setupTestBed(
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
      true
    );

    expect(navigatedPath).not.toEqual(expect.stringContaining('now-300m'));
    expect(navigatedPath).toEqual(expect.stringContaining('2020-03-23'));
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
