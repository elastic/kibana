/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../common/mock';

import { useSearchStrategy } from '../../../common/containers/use_search_strategy';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';

jest.mock('../../../common/containers/use_search_strategy', () => ({
  useSearchStrategy: jest.fn(),
}));

jest.mock('../../../common/hooks/use_app_toasts');

const mockUseSearchStrategy = useSearchStrategy as jest.Mock;
const mockSearch = jest.fn();
const mockRefetch = jest.fn();


  describe(`is risk score deprecated hook`, () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
      mockUseRiskScoreDeprecated.mockReturnValue({
        isLoading: false,
        isDeprecated: false,
        isEnabled: true,
        refetch: () => {},
      });
    });
    test('does not search if feature is not enabled', () => {
      mockUseRiskScoreDeprecated.mockReturnValue({
        isLoading: false,
        isDeprecated: false,
        isEnabled: false,
        refetch: () => {},
      });
      mockUseSearchStrategy.mockReturnValue({
        loading: false,
        result: {
          data: undefined,
          totalCount: 0,
        },
        search: mockSearch,
        refetch: mockRefetch,
        inspect: {},
        error: undefined,
      });
      const { result } = renderHook(() => fn(), {
        wrapper: TestProviders,
      });
      expect(mockSearch).not.toHaveBeenCalled();
      expect(result.current).toEqual([
        false,
        {
          data: undefined,
          inspect: {},
          isInspected: false,
          isModuleEnabled: false,
          isDeprecated: false,
          refetch: result.current[1].refetch,
          totalCount: 0,
        },
      ]);
    });

    test('if index is deprecated, isDeprecated should be true & search if feature is not enabled', () => {
      mockUseRiskScoreDeprecated.mockReturnValue({
        isLoading: false,
        isDeprecated: true,
        isEnabled: true,
        refetch: () => {},
      });
      mockUseSearchStrategy.mockReturnValue({
        loading: false,
        result: {
          data: undefined,
          totalCount: 0,
        },
        search: mockSearch,
        refetch: mockRefetch,
        inspect: {},
        error: undefined,
      });
      const { result } = renderHook(() => fn({ skip: true }), {
        wrapper: TestProviders,
      });
      expect(mockSearch).not.toHaveBeenCalled();
      expect(result.current).toEqual([
        false,
        {
          data: undefined,
          inspect: {},
          isInspected: false,
          isModuleEnabled: true,
          isDeprecated: true,
          refetch: result.current[1].refetch,
          totalCount: 0,
        },
      ]);
    });

    test('handle index not found error', () => {
      mockUseRiskScoreDeprecated.mockReturnValue({
        isLoading: false,
        isDeprecated: false,
        isEnabled: false,
        refetch: () => {},
      });
      mockUseSearchStrategy.mockReturnValue({
        loading: false,
        result: {
          data: undefined,
          totalCount: 0,
        },
        search: mockSearch,
        refetch: mockRefetch,
        inspect: {},
        error: {
          attributes: {
            caused_by: {
              type: 'index_not_found_exception',
            },
          },
        },
      });
      const { result } = renderHook(() => fn(), {
        wrapper: TestProviders,
      });
      expect(result.current).toEqual([
        false,
        {
          data: undefined,
          inspect: {},
          isInspected: false,
          isModuleEnabled: false,
          isDeprecated: false,
          refetch: result.current[1].refetch,
          totalCount: 0,
        },
      ]);
    });

    test('show error toast', () => {
      const error = new Error();
      mockUseSearchStrategy.mockReturnValue({
        loading: false,
        result: {
          data: undefined,
          totalCount: 0,
        },
        search: mockSearch,
        refetch: mockRefetch,
        inspect: {},
        error,
      });
      renderHook(() => fn(), {
        wrapper: TestProviders,
      });
      expect(appToastsMock.addError).toHaveBeenCalledWith(error, {
        title: 'Failed to run search on risk score',
      });
    });

    test('runs search if feature is enabled and not deprecated', () => {
      mockUseSearchStrategy.mockReturnValue({
        loading: false,
        result: {
          data: [],
          totalCount: 0,
        },
        search: mockSearch,
        refetch: mockRefetch,
        inspect: {},
        error: undefined,
      });
      renderHook(() => fn(), {
        wrapper: TestProviders,
      });
      expect(mockSearch).toHaveBeenCalledWith({
        defaultIndex: [`ml_${riskEntity}_risk_score_latest_default`],
        factoryQueryType: `${riskEntity}sRiskScore`,
        filterQuery: undefined,
        pagination: undefined,
        timerange: undefined,
        sort: undefined,
      });
    });

    test('return result', async () => {
      mockUseSearchStrategy.mockReturnValue({
        loading: false,
        result: {
          data: [],
          totalCount: 0,
        },
        search: mockSearch,
        refetch: mockRefetch,
        inspect: {},
        error: undefined,
      });
      const { result, waitFor } = renderHook(() => fn(), {
        wrapper: TestProviders,
      });
      await waitFor(() => {
        expect(result.current).toEqual([
          false,
          {
            data: [],
            inspect: {},
            isDeprecated: false,
            isInspected: false,
            isModuleEnabled: true,
            refetch: result.current[1].refetch,
            totalCount: 0,
          },
        ]);
      });
    });
  });
});
