/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import { useKibana } from '../../../common/lib/kibana';
import type {
  UseFetchUniqueHostWithFieldPairParams,
  UseFetchUniqueHostWithFieldPairResult,
} from './use_fetch_unique_hosts_with_field_value_pair';
import { useFetchUniqueHostsWithFieldPair } from './use_fetch_unique_hosts_with_field_value_pair';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../common/containers/use_global_time';

jest.mock('@tanstack/react-query');
jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/hooks/use_selector');
jest.mock('../../../common/containers/use_global_time');

const field = 'field';
const values = ['values'];
const isActiveTimelines = true;

describe('useFetchUniqueHostsWithFieldPair', () => {
  let hookResult: RenderHookResult<
    UseFetchUniqueHostWithFieldPairParams,
    UseFetchUniqueHostWithFieldPairResult
  >;

  (useKibana as jest.Mock).mockReturnValue({
    services: {
      data: { search: jest.fn() },
    },
  });
  (useDeepEqualSelector as jest.Mock).mockReturnValue({ to: '', from: '' });
  (useGlobalTime as jest.Mock).mockReturnValue({ to: '', from: '' });

  it('should return loading true while data is being fetched', async () => {
    (useQuery as jest.Mock).mockReturnValue({
      isLoading: true,
      isError: false,
      data: 0,
    });

    hookResult = renderHook(() =>
      useFetchUniqueHostsWithFieldPair({ field, values, isActiveTimelines })
    );

    expect(hookResult.result.current.loading).toBeTruthy();
    expect(hookResult.result.current.error).toBeFalsy();
    expect(hookResult.result.current.count).toBe(0);
  });

  it('should return error true when data fetching has errored out', async () => {
    (useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: true,
      data: 0,
    });

    hookResult = renderHook(() =>
      useFetchUniqueHostsWithFieldPair({ field, values, isActiveTimelines })
    );

    expect(hookResult.result.current.loading).toBeFalsy();
    expect(hookResult.result.current.error).toBeTruthy();
    expect(hookResult.result.current.count).toBe(0);
  });

  it('should return count on success', async () => {
    (useQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: 1,
    });

    hookResult = renderHook(() =>
      useFetchUniqueHostsWithFieldPair({ field, values, isActiveTimelines })
    );

    expect(hookResult.result.current.loading).toBeFalsy();
    expect(hookResult.result.current.error).toBeFalsy();
    expect(hookResult.result.current.count).toBe(1);
  });
});
