/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useRiskScore } from './use_risk_score';
import { TestProviders } from '../../../common/mock';

import { useSearchStrategy } from '../../../common/containers/use_search_strategy';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../common/hooks/use_app_toasts.mock';
import { useRiskScoreFeatureStatus } from './use_risk_score_feature_status';
import { useIsNewRiskScoreModuleInstalled } from './use_risk_engine_status';
import { RiskScoreEntity } from '../../../../common/search_strategy';
jest.mock('../../../common/containers/use_search_strategy', () => ({
  useSearchStrategy: jest.fn(),
}));

jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

jest.mock('../../../common/hooks/use_app_toasts');
jest.mock('./use_risk_score_feature_status');

jest.mock('./use_risk_engine_status');

const mockUseIsNewRiskScoreModuleInstalled = useIsNewRiskScoreModuleInstalled as jest.Mock;
const mockUseRiskScoreFeatureStatus = useRiskScoreFeatureStatus as jest.Mock;
const mockUseSearchStrategy = useSearchStrategy as jest.Mock;
const mockSearch = jest.fn();

let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

const defaultRiskScoreModuleStatus = {
  isLoading: false,
  installed: false,
};

const defaultFeatureStatus = {
  isLoading: false,
  isDeprecated: false,
  isAuthorized: true,
  isEnabled: true,
  refetch: () => {},
};
const defaultRisk = {
  data: undefined,
  inspect: {},
  isInspected: false,
  isAuthorized: true,
  isModuleEnabled: true,
  isDeprecated: false,
  totalCount: 0,
};
const defaultSearchResponse = {
  loading: false,
  result: {
    data: undefined,
    totalCount: 0,
  },
  search: mockSearch,
  refetch: () => {},
  inspect: {},
  error: undefined,
};
describe.each([RiskScoreEntity.host, RiskScoreEntity.user])(
  'useRiskScore entityType: %s',
  (riskEntity) => {
    beforeEach(() => {
      jest.clearAllMocks();
      appToastsMock = useAppToastsMock.create();
      (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
      mockUseRiskScoreFeatureStatus.mockReturnValue(defaultFeatureStatus);
      mockUseSearchStrategy.mockReturnValue(defaultSearchResponse);
      mockUseIsNewRiskScoreModuleInstalled.mockReturnValue(defaultRiskScoreModuleStatus);
    });

    test('does not search if license is not valid', () => {
      mockUseRiskScoreFeatureStatus.mockReturnValue({
        ...defaultFeatureStatus,
        isAuthorized: false,
      });
      const { result } = renderHook(() => useRiskScore({ riskEntity }), {
        wrapper: TestProviders,
      });
      expect(mockSearch).not.toHaveBeenCalled();
      expect(result.current).toEqual({
        loading: false,
        ...defaultRisk,
        isAuthorized: false,
        refetch: result.current.refetch,
      });
    });
    test('does not search if feature is not enabled', () => {
      mockUseRiskScoreFeatureStatus.mockReturnValue({
        ...defaultFeatureStatus,
        isEnabled: false,
      });

      const { result } = renderHook(() => useRiskScore({ riskEntity }), {
        wrapper: TestProviders,
      });
      expect(mockSearch).not.toHaveBeenCalled();
      expect(result.current).toEqual({
        loading: false,
        ...defaultRisk,
        isModuleEnabled: false,
        refetch: result.current.refetch,
      });
    });

    test('does not search if index is deprecated ', () => {
      mockUseRiskScoreFeatureStatus.mockReturnValue({
        ...defaultFeatureStatus,
        isDeprecated: true,
      });
      const { result } = renderHook(() => useRiskScore({ riskEntity, skip: true }), {
        wrapper: TestProviders,
      });
      expect(mockSearch).not.toHaveBeenCalled();
      expect(result.current).toEqual({
        loading: false,
        ...defaultRisk,
        isDeprecated: true,
        refetch: result.current.refetch,
      });
    });

    test('handle index not found error', () => {
      mockUseRiskScoreFeatureStatus.mockReturnValue({
        ...defaultFeatureStatus,
        isDeprecated: false,
        isEnabled: false,
      });
      mockUseSearchStrategy.mockReturnValue({
        ...defaultSearchResponse,
        error: {
          attributes: {
            caused_by: {
              type: 'index_not_found_exception',
            },
          },
        },
      });
      const { result } = renderHook(() => useRiskScore({ riskEntity }), {
        wrapper: TestProviders,
      });
      expect(result.current).toEqual({
        loading: false,
        ...defaultRisk,
        isModuleEnabled: false,
        refetch: result.current.refetch,
        error: {
          attributes: {
            caused_by: {
              type: 'index_not_found_exception',
            },
          },
        },
      });
    });

    test('show error toast', () => {
      const error = new Error();
      mockUseSearchStrategy.mockReturnValue({
        ...defaultSearchResponse,
        error,
      });
      renderHook(() => useRiskScore({ riskEntity }), {
        wrapper: TestProviders,
      });
      expect(appToastsMock.addError).toHaveBeenCalledWith(error, {
        title: 'Failed to run search on risk score',
      });
    });

    test('runs search if feature is enabled and not deprecated', () => {
      renderHook(() => useRiskScore({ riskEntity }), {
        wrapper: TestProviders,
      });

      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(mockSearch).toHaveBeenCalledWith({
        defaultIndex: [`ml_${riskEntity}_risk_score_latest_default`],
        factoryQueryType: `${riskEntity}sRiskScore`,
        riskScoreEntity: riskEntity,
        includeAlertsCount: false,
      });
    });

    test('runs search with new index if feature is enabled and not deprecated and new module installed', () => {
      mockUseIsNewRiskScoreModuleInstalled.mockReturnValue({
        ...defaultRiskScoreModuleStatus,
        installed: true,
      });

      renderHook(() => useRiskScore({ riskEntity }), {
        wrapper: TestProviders,
      });

      expect(mockSearch).toHaveBeenCalledTimes(1);
      expect(mockSearch).toHaveBeenCalledWith({
        defaultIndex: ['risk-score.risk-score-latest-default'],
        factoryQueryType: `${riskEntity}sRiskScore`,
        riskScoreEntity: riskEntity,
        includeAlertsCount: false,
      });
    });

    test('return result', async () => {
      mockUseSearchStrategy.mockReturnValue({
        ...defaultSearchResponse,
        result: {
          data: [],
          totalCount: 0,
        },
      });
      const { result, waitFor } = renderHook(() => useRiskScore({ riskEntity }), {
        wrapper: TestProviders,
      });
      await waitFor(() => {
        expect(result.current).toEqual({
          loading: false,
          ...defaultRisk,
          data: [],
          refetch: result.current.refetch,
        });
      });
    });
  }
);
