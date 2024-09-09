/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../common/mock';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import { useCalculateEntityRiskScore } from './use_calculate_entity_risk_score';
import { waitFor } from '@testing-library/react';
import { RiskEngineStatusEnum } from '../../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';

const enabledRiskEngineStatus = {
  risk_engine_status: RiskEngineStatusEnum.ENABLED,
};
const disabledRiskEngineStatus = {
  risk_engine_status: RiskEngineStatusEnum.DISABLED,
};

const mockUseRiskEngineStatus = jest.fn();
jest.mock('./use_risk_engine_status', () => ({
  useRiskEngineStatus: () => mockUseRiskEngineStatus(),
}));

const mockCalculateEntityRiskScore = jest.fn();
jest.mock('../api', () => ({
  useEntityAnalyticsRoutes: () => ({
    calculateEntityRiskScore: mockCalculateEntityRiskScore,
  }),
}));

const mockAddError = jest.fn();
jest.mock('../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn().mockReturnValue({
    addError: () => mockAddError(),
  }),
}));

const identifierType = RiskScoreEntity.user;
const identifier = 'test-user';
const options = {
  onSuccess: jest.fn(),
};

describe('useRiskScoreData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRiskEngineStatus.mockReturnValue({ data: enabledRiskEngineStatus });
    mockCalculateEntityRiskScore.mockResolvedValue({});
  });

  it('should call calculateEntityRiskScore API when the callback function is called', async () => {
    const { result } = renderHook(
      () => useCalculateEntityRiskScore(identifierType, identifier, options),
      { wrapper: TestProviders }
    );

    await act(async () => {
      result.current.calculateEntityRiskScore();

      await waitFor(() =>
        expect(mockCalculateEntityRiskScore).toHaveBeenCalledWith(
          expect.objectContaining({
            identifier_type: identifierType,
            identifier,
          })
        )
      );
    });
  });

  it('should NOT call calculateEntityRiskScore API when risk engine is disabled', async () => {
    mockUseRiskEngineStatus.mockReturnValue({
      data: disabledRiskEngineStatus,
    });
    const { result } = renderHook(
      () => useCalculateEntityRiskScore(identifierType, identifier, options),
      { wrapper: TestProviders }
    );

    await act(async () => {
      result.current.calculateEntityRiskScore();

      await waitFor(() => expect(mockCalculateEntityRiskScore).not.toHaveBeenCalled());
    });
  });

  it('should display a toast error when the API returns an error', async () => {
    mockCalculateEntityRiskScore.mockRejectedValue({});
    const { result } = renderHook(
      () => useCalculateEntityRiskScore(identifierType, identifier, options),
      { wrapper: TestProviders }
    );

    await act(async () => {
      result.current.calculateEntityRiskScore();

      await waitFor(() => expect(mockAddError).toHaveBeenCalled());
    });
  });
});
