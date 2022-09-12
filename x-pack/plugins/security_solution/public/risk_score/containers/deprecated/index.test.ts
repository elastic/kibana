/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../common/mock';

import { useRiskScoreDeprecated } from '.';
import { RiskQueries } from '../../../../common/search_strategy';
import { useQuery } from '../../../common/hooks/use_query';
import { RiskEntity } from './api';
jest.mock('../../../common/hooks/use_query');

const mockUseFetch = useQuery as jest.Mock;
const mockFetch = jest.fn();
const mockRefetch = jest.fn();

describe(`is risk score deprecated hook`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('does not search if feature is not enabled, and initial isDeprecated state is false', () => {
    mockUseFetch.mockReturnValue({
      data: undefined,
      error: undefined,
      fetch: mockFetch,
      isLoading: false,
      refetch: mockRefetch,
    });
    const { result } = renderHook(
      () => useRiskScoreDeprecated(false, RiskQueries.hostsRiskScore, 'the_right_one'),
      {
        wrapper: TestProviders,
      }
    );
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      error: undefined,
      isDeprecated: false,
      isEnabled: false,
      isLoading: false,
      refetch: result.current.refetch,
    });
  });

  test('runs search if feature is enabled, and initial isDeprecated state is true', () => {
    mockUseFetch.mockReturnValue({
      data: undefined,
      error: undefined,
      query: mockFetch,
      isLoading: false,
      refetch: mockRefetch,
    });
    const { result } = renderHook(
      () => useRiskScoreDeprecated(true, RiskQueries.hostsRiskScore, 'the_right_one'),
      {
        wrapper: TestProviders,
      }
    );
    expect(mockFetch).toHaveBeenCalledWith({
      query: { entity: RiskEntity.host, indexName: 'the_right_one' },
    });
    expect(result.current).toEqual({
      error: undefined,
      isDeprecated: true,
      isEnabled: true,
      isLoading: false,
      refetch: result.current.refetch,
    });
  });

  test('updates state after search returns isDeprecated = false', () => {
    mockUseFetch.mockReturnValue({
      data: undefined,
      error: undefined,
      query: mockFetch,
      isLoading: false,
      refetch: mockRefetch,
    });
    const { result, rerender } = renderHook(
      () => useRiskScoreDeprecated(true, RiskQueries.hostsRiskScore, 'the_right_one'),
      {
        wrapper: TestProviders,
      }
    );
    expect(result.current).toEqual({
      error: undefined,
      isDeprecated: true,
      isEnabled: true,
      isLoading: false,
      refetch: result.current.refetch,
    });
    mockUseFetch.mockReturnValue({
      data: {
        isDeprecated: false,
        isEnabled: true,
      },
      error: undefined,
      query: mockFetch,
      isLoading: false,
      refetch: mockRefetch,
    });
    act(() => rerender());
    expect(result.current).toEqual({
      error: undefined,
      isDeprecated: false,
      isEnabled: true,
      isLoading: false,
      refetch: result.current.refetch,
    });
  });
});
