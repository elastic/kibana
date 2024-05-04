/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import type { UseCasesByStatusProps, UseCasesByStatusResults } from './use_cases_by_status';
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

const mockGetCasesStatus = jest.fn();
mockGetCasesStatus.mockResolvedValue({
  countOpenCases: 1,
  countInProgressCases: 2,
  countClosedCases: 3,
});

mockGetCasesStatus.mockResolvedValueOnce({
  countOpenCases: 0,
  countInProgressCases: 0,
  countClosedCases: 0,
});

const mockUseKibana = {
  services: {
    cases: {
      ...mockCasesContract(),
      api: {
        cases: {
          getCasesStatus: mockGetCasesStatus,
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
  test('init', () => {
    const { result } = renderHook<
      PropsWithChildren<UseCasesByStatusProps>,
      UseCasesByStatusResults
    >(() => useCasesByStatus({}), {
      wrapper: TestProviders,
    });
    expect(result.current).toEqual({
      closed: 0,
      inProgress: 0,
      isLoading: true,
      open: 0,
      totalCounts: 0,
      updatedAt: dateNow,
    });
  });

  test('fetch data', async () => {
    const { result, waitForNextUpdate } = renderHook<
      PropsWithChildren<UseCasesByStatusProps>,
      UseCasesByStatusResults
    >(() => useCasesByStatus({ skip: false }), {
      wrapper: TestProviders,
    });
    await waitForNextUpdate();
    expect(result.current).toEqual({
      closed: 3,
      inProgress: 2,
      isLoading: false,
      open: 1,
      totalCounts: 6,
      updatedAt: dateNow,
    });
  });

  test('it should call setQuery when fetching', async () => {
    const { waitForNextUpdate } = renderHook<
      PropsWithChildren<UseCasesByStatusProps>,
      UseCasesByStatusResults
    >(() => useCasesByStatus({ skip: false }), {
      wrapper: TestProviders,
    });
    await waitForNextUpdate();
    expect(mockSetQuery).toHaveBeenCalled();
  });

  test('it should call deleteQuery when unmounting', async () => {
    const { waitForNextUpdate, unmount } = renderHook<
      PropsWithChildren<UseCasesByStatusProps>,
      UseCasesByStatusResults
    >(() => useCasesByStatus({ skip: false }), {
      wrapper: TestProviders,
    });
    await waitForNextUpdate();

    unmount();

    expect(mockDeleteQuery).toHaveBeenCalled();
  });

  test('skip', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    const localProps = { skip: false };

    const { rerender, waitForNextUpdate } = renderHook<
      PropsWithChildren<UseCasesByStatusProps>,
      UseCasesByStatusResults
    >(() => useCasesByStatus(localProps), {
      wrapper: TestProviders,
    });
    await waitForNextUpdate();

    localProps.skip = true;
    act(() => rerender());
    act(() => rerender());
    expect(abortSpy).toHaveBeenCalledTimes(2);
  });
});
