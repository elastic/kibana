/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import { useCasesByStatus } from './use_cases_by_status';

const dateNow = new Date('2022-04-08T12:00:00.000Z').valueOf();
const mockDateNow = jest.fn().mockReturnValue(dateNow);
Date.now = jest.fn(() => mockDateNow()) as unknown as DateConstructor['now'];
const mockSetQuery = jest.fn();
const mockDeleteQuery = jest.fn();

jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: jest.fn().mockReturnValue({
      from: '2022-04-05T12:00:00.000Z',
      to: '2022-04-08T12:00:00.000Z',
      setQuery: () => mockSetQuery(),
      deleteQuery: () => mockDeleteQuery(),
    }),
  };
});
jest.mock('../../../../common/lib/kibana');

const mockGetCasesMetrics = jest.fn();
mockGetCasesMetrics.mockResolvedValue({
  status: {
    open: 1,
    inProgress: 2,
    closed: 3,
  },
});

const mockUseKibana = {
  services: {
    cases: {
      ...mockCasesContract(),
      api: {
        cases: {
          getCasesMetrics: mockGetCasesMetrics,
        },
      },
    },
  },
};

(useKibana as jest.Mock).mockReturnValue(mockUseKibana);

describe('useCasesByStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('init', async () => {
    mockGetCasesMetrics.mockResolvedValueOnce({
      status: {
        open: 0,
        inProgress: 0,
        closed: 0,
      },
    });

    const { result } = renderHook(() => useCasesByStatus({}), {
      wrapper: TestProviders,
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        closed: 0,
        inProgress: 0,
        isLoading: true,
        open: 0,
        totalCounts: 0,
        updatedAt: dateNow,
      });
    });
  });

  test('fetch data', async () => {
    const { result } = renderHook(() => useCasesByStatus({ skip: false }), {
      wrapper: TestProviders,
    });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current).toEqual({
        closed: 3,
        inProgress: 2,
        isLoading: false,
        open: 1,
        totalCounts: 6,
        updatedAt: dateNow,
      });
    });
  });

  test('it should call setQuery when fetching', async () => {
    renderHook(() => useCasesByStatus({ skip: false }), {
      wrapper: TestProviders,
    });
    await waitFor(() => expect(mockSetQuery).toHaveBeenCalled());
  });

  test('it should call deleteQuery when unmounting', async () => {
    // muting setState warning that happens on unmount
    // because it's a noop and going to be removed
    // in the next version of React
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderHook(() => useCasesByStatus({ skip: false }), {
      wrapper: TestProviders,
    });

    unmount();

    waitFor(() => {
      expect(mockDeleteQuery).toHaveBeenCalled();
    });

    consoleError.mockRestore();
  });

  test('skip', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    const localProps = { skip: false };

    const { rerender } = renderHook(() => useCasesByStatus(localProps), {
      wrapper: TestProviders,
    });

    localProps.skip = true;

    rerender();
    rerender();

    await waitFor(() => {
      expect(abortSpy).toHaveBeenCalledTimes(2);
    });
  });
});
