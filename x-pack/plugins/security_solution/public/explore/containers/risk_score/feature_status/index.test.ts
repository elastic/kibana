/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../../common/mock';

import { useRiskScoreFeatureStatus } from '.';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { useFetch } from '../../../../common/hooks/use_fetch';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';

jest.mock('../../../../common/hooks/use_fetch');
jest.mock('../../../../common/components/ml/hooks/use_ml_capabilities');

const mockFetch = jest.fn();
const mockUseMlCapabilities = useMlCapabilities as jest.Mock;
const mockUseFetch = useFetch as jest.Mock;

describe(`risk score feature status`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMlCapabilities.mockReturnValue({ isPlatinumOrTrialLicense: true });
    mockUseFetch.mockReturnValue(defaultFetch);
  });

  const defaultFetch = {
    data: undefined,
    error: undefined,
    fetch: mockFetch,
    isLoading: false,
    refetch: () => {},
  };
  const defaultResult = {
    error: undefined,
    isDeprecated: true,
    isLicenseValid: true,
    isEnabled: true,
    isLoading: true,
  };

  test('does not search if license is not valid, and initial isDeprecated state is false', () => {
    mockUseMlCapabilities.mockReturnValue({ isPlatinumOrTrialLicense: false });
    const { result } = renderHook(
      () => useRiskScoreFeatureStatus(RiskScoreEntity.host, 'the_right_one'),
      {
        wrapper: TestProviders,
      }
    );
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      ...defaultResult,
      isLicenseValid: false,
      isDeprecated: false,
      isEnabled: false,
      refetch: result.current.refetch,
    });
  });

  test('runs search if feature is enabled, and initial isDeprecated state is true', () => {
    const { result } = renderHook(
      () => useRiskScoreFeatureStatus(RiskScoreEntity.host, 'the_right_one'),
      {
        wrapper: TestProviders,
      }
    );
    expect(mockFetch).toHaveBeenCalledWith({
      query: { entity: RiskScoreEntity.host, indexName: 'the_right_one' },
    });
    expect(result.current).toEqual({
      ...defaultResult,
      refetch: result.current.refetch,
    });
  });

  test('updates state after search returns isDeprecated = false', () => {
    const { result, rerender } = renderHook(
      () => useRiskScoreFeatureStatus(RiskScoreEntity.host, 'the_right_one'),
      {
        wrapper: TestProviders,
      }
    );
    expect(result.current).toEqual({
      ...defaultResult,
      refetch: result.current.refetch,
    });
    mockUseFetch.mockReturnValue({
      ...defaultFetch,
      data: {
        isDeprecated: false,
        isEnabled: true,
      },
    });
    act(() => rerender());
    expect(result.current).toEqual({
      ...defaultResult,
      isDeprecated: false,
      refetch: result.current.refetch,
    });
  });
});
