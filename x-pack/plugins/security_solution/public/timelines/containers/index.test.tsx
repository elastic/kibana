/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { initSortDefault, TimelineArgs, useTimelineEvents, UseTimelineEventsProps } from '.';
import { SecurityPageName } from '../../../common/constants';
import { TimelineId } from '../../../common/types/timeline';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { mockTimelineData } from '../../common/mock';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const mockEvents = mockTimelineData.filter((i, index) => index <= 11);

const mockSearch = jest.fn();

jest.mock('../../common/hooks/use_experimental_features');
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

jest.mock('../../common/lib/kibana', () => ({
  useToasts: jest.fn().mockReturnValue({
    addError: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
  }),
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {
        capabilities: {
          siem: {
            crud: true,
          },
        },
      },
      data: {
        search: {
          search: jest.fn().mockImplementation((args) => {
            mockSearch();
            return {
              subscribe: jest.fn().mockImplementation(({ next }) => {
                next({
                  isRunning: false,
                  isPartial: false,
                  inspect: {
                    dsl: [],
                    response: [],
                  },
                  edges: mockEvents.map((item) => ({ node: item })),
                  pageInfo: {
                    activePage: 0,
                    totalPages: 10,
                  },
                  rawResponse: {},
                  totalCount: mockTimelineData.length,
                });
                return { unsubscribe: jest.fn() };
              }),
            };
          }),
        },
      },
      notifications: {
        toasts: {
          addWarning: jest.fn(),
        },
      },
    },
  }),
}));

const mockUseRouteSpy: jest.Mock = useRouteSpy as jest.Mock;
jest.mock('../../common/utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn(),
}));

mockUseRouteSpy.mockReturnValue([
  {
    pageName: SecurityPageName.overview,
    detailName: undefined,
    tabName: undefined,
    search: '',
    pathName: '/overview',
  },
]);

describe('useTimelineEvents', () => {
  useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
  beforeEach(() => {
    mockSearch.mockReset();
  });

  const startDate: string = '2020-07-07T08:20:18.966Z';
  const endDate: string = '3000-01-01T00:00:00.000Z';
  const props: UseTimelineEventsProps = {
    dataViewId: 'data-view-id',
    docValueFields: [],
    endDate: '',
    id: TimelineId.active,
    indexNames: ['filebeat-*'],
    fields: [],
    filterQuery: '',
    startDate: '',
    limit: 25,
    runtimeMappings: {},
    sort: initSortDefault,
    skip: false,
  };

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseTimelineEventsProps,
        [boolean, TimelineArgs]
      >((args) => useTimelineEvents(args), {
        initialProps: { ...props },
      });

      // useEffect on params request
      await waitForNextUpdate();
      expect(result.current).toEqual([
        false,
        {
          events: [],
          id: TimelineId.active,
          inspect: result.current[1].inspect,
          loadPage: result.current[1].loadPage,
          pageInfo: result.current[1].pageInfo,
          refetch: result.current[1].refetch,
          totalCount: -1,
          updatedAt: 0,
        },
      ]);
    });
  });

  test('happy path query', async () => {
    await act(async () => {
      const { result, waitForNextUpdate, rerender } = renderHook<
        UseTimelineEventsProps,
        [boolean, TimelineArgs]
      >((args) => useTimelineEvents(args), {
        initialProps: { ...props },
      });

      // useEffect on params request
      await waitForNextUpdate();
      rerender({ ...props, startDate, endDate });
      // useEffect on params request
      await waitForNextUpdate();

      expect(mockSearch).toHaveBeenCalledTimes(2);
      expect(result.current).toEqual([
        false,
        {
          events: mockEvents,
          id: TimelineId.active,
          inspect: result.current[1].inspect,
          loadPage: result.current[1].loadPage,
          pageInfo: result.current[1].pageInfo,
          refetch: result.current[1].refetch,
          totalCount: 32,
          updatedAt: result.current[1].updatedAt,
        },
      ]);
    });
  });

  test('Mock cache for active timeline when switching page', async () => {
    await act(async () => {
      const { result, waitForNextUpdate, rerender } = renderHook<
        UseTimelineEventsProps,
        [boolean, TimelineArgs]
      >((args) => useTimelineEvents(args), {
        initialProps: { ...props },
      });

      // useEffect on params request
      await waitForNextUpdate();
      rerender({ ...props, startDate, endDate });
      // useEffect on params request
      await waitForNextUpdate();

      mockUseRouteSpy.mockReturnValue([
        {
          pageName: SecurityPageName.timelines,
          detailName: undefined,
          tabName: undefined,
          search: '',
          pathName: '/timelines',
        },
      ]);

      expect(mockSearch).toHaveBeenCalledTimes(2);

      expect(result.current).toEqual([
        false,
        {
          events: mockEvents,
          id: TimelineId.active,
          inspect: result.current[1].inspect,
          loadPage: result.current[1].loadPage,
          pageInfo: result.current[1].pageInfo,
          refetch: result.current[1].refetch,
          totalCount: 32,
          updatedAt: result.current[1].updatedAt,
        },
      ]);
    });
  });

  test('Correlation pagination is calling search strategy when switching page', async () => {
    await act(async () => {
      const { result, waitForNextUpdate, rerender } = renderHook<
        UseTimelineEventsProps,
        [boolean, TimelineArgs]
      >((args) => useTimelineEvents(args), {
        initialProps: {
          ...props,
          language: 'eql',
          eqlOptions: {
            eventCategoryField: 'category',
            tiebreakerField: '',
            timestampField: '@timestamp',
            query: 'find it EQL',
            size: 100,
          },
        },
      });

      // useEffect on params request
      await waitForNextUpdate();
      rerender({
        ...props,
        startDate,
        endDate,
        language: 'eql',
        eqlOptions: {
          eventCategoryField: 'category',
          tiebreakerField: '',
          timestampField: '@timestamp',
          query: 'find it EQL',
          size: 100,
        },
      });
      // useEffect on params request
      await waitForNextUpdate();
      mockSearch.mockReset();
      result.current[1].loadPage(4);
      await waitForNextUpdate();
      expect(mockSearch).toHaveBeenCalledTimes(1);
    });
  });
});
