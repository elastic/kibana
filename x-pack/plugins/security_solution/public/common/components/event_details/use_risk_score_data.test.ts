/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../mock';
import { ONLY_FIRST_ITEM_PAGINATION, useRiskScoreData } from './use_risk_score_data';
import { useRiskScore } from '../../../explore/containers/risk_score';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import { RiskScoreEntity } from '../../../../common/search_strategy';

jest.mock('../../../explore/containers/risk_score');
jest.mock('../../../timelines/components/side_panel/event_details/helpers');
const mockUseRiskScore = useRiskScore as jest.Mock;
const mockUseBasicDataFromDetailsData = useBasicDataFromDetailsData as jest.Mock;
const defaultResult = {
  data: [],
  inspect: {},
  isInspected: false,
  isLicenseValid: true,
  isModuleEnabled: true,
  refetch: () => {},
  totalCount: 0,
  loading: false,
};
const defaultRisk = {
  loading: false,
  isModuleEnabled: true,
  result: [],
};

const defaultArgs = [
  {
    field: 'host.name',
    isObjectArray: false,
  },
];

describe('useRiskScoreData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRiskScore.mockReturnValue(defaultResult);
    mockUseBasicDataFromDetailsData.mockReturnValue({
      hostName: 'host',
      userName: 'user',
    });
  });
  test('returns expected default values', () => {
    const { result } = renderHook(() => useRiskScoreData(defaultArgs), {
      wrapper: TestProviders,
    });
    expect(result.current).toEqual({
      hostRisk: defaultRisk,
      userRisk: defaultRisk,
      isLicenseValid: true,
    });
  });

  test('builds filter query for risk score hooks', () => {
    renderHook(() => useRiskScoreData(defaultArgs), {
      wrapper: TestProviders,
    });
    expect(mockUseRiskScore).toHaveBeenCalledWith({
      filterQuery: { terms: { 'user.name': ['user'] } },
      pagination: ONLY_FIRST_ITEM_PAGINATION,
      skip: false,
      riskEntity: RiskScoreEntity.user,
    });
    expect(mockUseRiskScore).toHaveBeenCalledWith({
      filterQuery: { terms: { 'host.name': ['host'] } },
      pagination: ONLY_FIRST_ITEM_PAGINATION,
      skip: false,
      riskEntity: RiskScoreEntity.host,
    });
  });

  test('skips risk score hooks with no entity name', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ hostName: undefined, userName: undefined });
    renderHook(() => useRiskScoreData(defaultArgs), {
      wrapper: TestProviders,
    });
    expect(mockUseRiskScore).toHaveBeenCalledWith({
      filterQuery: undefined,
      pagination: ONLY_FIRST_ITEM_PAGINATION,
      skip: true,
      riskEntity: RiskScoreEntity.user,
    });
    expect(mockUseRiskScore).toHaveBeenCalledWith({
      filterQuery: undefined,
      pagination: ONLY_FIRST_ITEM_PAGINATION,
      skip: true,
      riskEntity: RiskScoreEntity.host,
    });
  });
});
