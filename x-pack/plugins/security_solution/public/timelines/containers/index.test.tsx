/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { initSortDefault, TimelineArgs, useTimelineEvents, UseTimelineEventsProps } from '.';
import { SecurityPageName } from '../../../common/constants';
import { TimelineId } from '../../../common/types/timeline';
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

jest.mock('../../common/lib/kibana', () => ({
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
  beforeEach(() => {
    mockSearch.mockReset();
  });

  const startDate: string = '2020-07-07T08:20:18.966Z';
  const endDate: string = '3000-01-01T00:00:00.000Z';
  const props: UseTimelineEventsProps = {
    docValueFields: [],
    endDate: '',
    id: TimelineId.active,
    indexNames: ['filebeat-*'],
    fields: [],
    filterQuery: '',
    startDate: '',
    limit: 25,
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

      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(result.current).toEqual([
        false,
        {
          events: mockEvents,
          id: TimelineId.active,
          inspect: result.current[1].inspect,
          loadPage: result.current[1].loadPage,
          pageInfo: result.current[1].pageInfo,
          refetch: result.current[1].refetch,
          totalCount: 31,
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

      expect(mockSearch).toHaveBeenCalledTimes(1);

      expect(result.current).toEqual([
        false,
        {
          events: mockEvents,
          id: TimelineId.active,
          inspect: result.current[1].inspect,
          loadPage: result.current[1].loadPage,
          pageInfo: result.current[1].pageInfo,
          refetch: result.current[1].refetch,
          totalCount: 31,
          updatedAt: result.current[1].updatedAt,
        },
      ]);
    });
  });
});
