/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../mock';
import { useHostRelatedUsers } from '.';
import { useSearchStrategy } from '../../use_search_strategy';

jest.mock('../../use_search_strategy', () => ({
  useSearchStrategy: jest.fn(),
}));

const mockUseSearchStrategy = useSearchStrategy as jest.Mock;
const mockSearch = jest.fn();

const defaultProps = {
  hostName: 'host1',
  indexNames: ['index-*'],
  from: '2020-07-07T08:20:18.966Z',
  skip: false,
};

const mockResult = {
  inspect: {},
  totalCount: 1,
  relatedUsers: [{ user: 'test user', ip: '100.000.XX' }],
  refetch: jest.fn(),
  loading: false,
};

describe('useHostRelatedUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchStrategy.mockReturnValue({
      loading: false,
      result: {
        totalCount: mockResult.totalCount,
        relatedUsers: mockResult.relatedUsers,
      },
      search: mockSearch,
      refetch: jest.fn(),
      inspect: {},
    });
  });

  it('runs search', () => {
    const { result } = renderHook(() => useHostRelatedUsers(defaultProps), {
      wrapper: TestProviders,
    });

    expect(mockSearch).toHaveBeenCalled();
    expect(JSON.stringify(result.current)).toEqual(JSON.stringify(mockResult)); // serialize result for array comparison
  });

  it('does not run search when skip = true', () => {
    const props = {
      ...defaultProps,
      skip: true,
    };
    renderHook(() => useHostRelatedUsers(props), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });
  it('skip = true will cancel any running request', () => {
    const props = {
      ...defaultProps,
    };
    const { rerender } = renderHook(() => useHostRelatedUsers(props), {
      wrapper: TestProviders,
    });
    props.skip = true;
    act(() => rerender());
    expect(mockUseSearchStrategy).toHaveBeenCalledTimes(2);
    expect(mockUseSearchStrategy.mock.calls[1][0].abort).toEqual(true);
  });
});
