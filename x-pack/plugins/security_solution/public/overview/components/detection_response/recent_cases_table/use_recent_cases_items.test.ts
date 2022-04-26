/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { mockRecentCasesResult, parsedRecentCases } from './mock_data';
import { useRecentlyOpenedCases, UseRecentlyOpenedCasesProps } from './use_recent_cases_items';

import type { UseRecentlyOpenedCases } from './use_recent_cases_items';

const dateNow = new Date('2022-04-08T12:00:00.000Z').valueOf();
const mockDateNow = jest.fn().mockReturnValue(dateNow);
Date.now = jest.fn(() => mockDateNow()) as unknown as DateConstructor['now'];

const defaultCasesReturn = {
  cases: [],
};

const mockCasesApi = jest.fn().mockResolvedValue(defaultCasesReturn);
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      cases: {
        api: {
          cases: {
            find: jest.fn().mockResolvedValue(defaultCasesReturn),
          },
        },
      },
    },
  }),
}));

const from = '2020-07-07T08:20:18.966Z';
const to = '2020-07-08T08:20:18.966Z';

const mockUseGlobalTime = jest.fn().mockReturnValue({ from, to });
jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const renderUseRecentCasesItems = (overrides: Partial<UseRecentlyOpenedCasesProps> = {}) =>
  renderHook<UseRecentlyOpenedCases, ReturnType<UseRecentlyOpenedCases>>(() =>
    useRecentlyOpenedCases({ skip: false, ...overrides })
  );

describe('useRecentCasesItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(dateNow);
    mockCasesApi.mockReturnValue(defaultCasesReturn);
  });

  it.only('should return default values', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderUseRecentCasesItems();

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        items: [],
        isLoading: false,
        updatedAt: dateNow,
      });
    });

    expect(mockCasesApi).toBeCalledWith({
      from: 0,
      to: 9,
      owner: 9,
      sortField: 'create_at',
      sortOrder: 'desc',
      page: 1,
      perPage: 4,
    });
  });

  it('should return parsed items', () => {
    mockCasesApi.mockReturnValue({
      mockRecentCasesResult,
    });

    const { result } = renderUseRecentCasesItems();

    expect(result.current).toEqual({
      items: parsedRecentCases,
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should return new updatedAt', () => {
    const newDateNow = new Date('2022-04-08T14:00:00.000Z').valueOf();
    mockDateNow.mockReturnValue(newDateNow); // setUpdatedAt call
    mockDateNow.mockReturnValueOnce(dateNow); // initialization call

    mockCasesApi.mockReturnValue({
      mockRecentCasesResult,
    });

    const { result } = renderUseRecentCasesItems();
    expect(mockDateNow).toHaveBeenCalled();
    expect(result.current).toEqual({
      items: parsedRecentCases,
      isLoading: false,
      updatedAt: newDateNow,
    });
  });

  it('should skip the query', () => {
    const { result } = renderUseRecentCasesItems({ skip: true });

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
    });
  });
});
