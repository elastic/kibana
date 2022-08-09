/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../common/mock';
import { useNetworkHttp, ID } from '.';
import { useSearchStrategy } from '../../../common/containers/use_search_strategy';
import { networkModel } from '../../store';

jest.mock('../../../common/containers/use_search_strategy', () => ({
  useSearchStrategy: jest.fn(),
}));
const mockUseSearchStrategy = useSearchStrategy as jest.Mock;
const mockSearch = jest.fn();

const props = {
  endDate: '2020-07-08T08:20:18.966Z',
  indexNames: ['auditbeat-*'],
  skip: false,
  startDate: '2020-07-07T08:20:18.966Z',
  type: networkModel.NetworkType.page,
  id: ID,
};

const initialResult = {
  edges: [],
  totalCount: undefined,
  pageInfo: {
    activePage: 0,
    fakeTotalCount: 0,
    showMorePagesIndicator: false,
  },
};

describe('useNetworkHttp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchStrategy.mockReturnValue({
      loading: false,
      result: {
        edges: [],
        totalCount: -1,
        pageInfo: {
          activePage: 0,
          fakeTotalCount: 0,
          showMorePagesIndicator: false,
        },
      },
      search: mockSearch,
      refetch: jest.fn(),
      inspect: {},
    });
  });

  it('runs search', () => {
    renderHook(() => useNetworkHttp(props), {
      wrapper: TestProviders,
    });

    expect(mockSearch).toHaveBeenCalledWith({
      defaultIndex: props.indexNames,
      factoryQueryType: 'http',
      filterQuery: undefined,
      ip: undefined,
      pagination: {
        activePage: 0,
        cursorStart: 0,
        fakePossibleCount: 50,
        querySize: 10,
      },
      sort: {
        direction: 'desc',
      },
      timerange: {
        from: '2020-07-07T08:20:18.966Z',
        interval: '12h',
        to: '2020-07-08T08:20:18.966Z',
      },
    });
  });

  it('returns result', () => {
    const mockInspect = {};
    const mockRefetch = jest.fn();
    mockUseSearchStrategy.mockReturnValue({
      loading: true,
      result: initialResult,
      search: mockSearch,
      refetch: mockRefetch,
      inspect: mockInspect,
    });

    const { result } = renderHook(() => useNetworkHttp(props), {
      wrapper: TestProviders,
    });
    expect(result.current[0]).toEqual(true);

    expect(result.current[1].endDate).toEqual(props.endDate);
    expect(result.current[1].id).toEqual(props.id);
    expect(result.current[1].inspect).toEqual(mockInspect);
    expect(typeof result.current[1].loadPage).toEqual('function');
    expect(result.current[1].pageInfo).toEqual(initialResult.pageInfo);
    expect(result.current[1].refetch).toEqual(mockRefetch);
    expect(result.current[1].networkHttp).toEqual(initialResult.edges);
    expect(result.current[1].totalCount).toEqual(initialResult.totalCount);
    expect(result.current[1].startDate).toEqual(props.startDate);
  });

  it('does not run search when skip = true', () => {
    const localProps = {
      ...props,
      skip: true,
    };
    renderHook(() => useNetworkHttp(localProps), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('skip = true will cancel any running request', () => {
    const localProps = {
      ...props,
    };
    const { rerender } = renderHook(() => useNetworkHttp(localProps), {
      wrapper: TestProviders,
    });
    localProps.skip = true;
    act(() => rerender());
    expect(mockUseSearchStrategy).toHaveBeenCalledTimes(3);
    expect(mockUseSearchStrategy.mock.calls[2][0].abort).toEqual(true);
  });
});
