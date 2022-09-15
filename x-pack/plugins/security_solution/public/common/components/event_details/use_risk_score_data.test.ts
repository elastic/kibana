/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../mock';
import { ONLY_FIRST_ITEM_PAGINATION, useRiskScoreData } from './use_risk_score_data';
import { useUserRiskScore, useHostRiskScore } from '../../../risk_score/containers';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';

const mockUseUserRiskScore = useUserRiskScore as jest.Mock;
const mockUseHostRiskScore = useHostRiskScore as jest.Mock;
const mockUseBasicDataFromDetailsData = useBasicDataFromDetailsData as jest.Mock;
jest.mock('../../../risk_score/containers');
jest.mock('../../../timelines/components/side_panel/event_details/helpers');
const defaultResult = {
  data: [],
  inspect: {},
  isInspected: false,
  isLicenseValid: true,
  isModuleEnabled: true,
  refetch: () => {},
  totalCount: 0,
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
    mockUseUserRiskScore.mockReturnValue([false, defaultResult]);
    mockUseHostRiskScore.mockReturnValue([false, defaultResult]);
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
    expect(mockUseUserRiskScore).toHaveBeenCalledWith({
      filterQuery: { terms: { 'user.name': ['user'] } },
      pagination: ONLY_FIRST_ITEM_PAGINATION,
      skip: false,
    });
    expect(mockUseHostRiskScore).toHaveBeenCalledWith({
      filterQuery: { terms: { 'host.name': ['host'] } },
      pagination: ONLY_FIRST_ITEM_PAGINATION,
      skip: false,
    });
  });

  test('skips risk score hooks with no entity name', () => {
    mockUseBasicDataFromDetailsData.mockReturnValue({ hostName: undefined, userName: undefined });
    renderHook(() => useRiskScoreData(defaultArgs), {
      wrapper: TestProviders,
    });
    expect(mockUseUserRiskScore).toHaveBeenCalledWith({
      filterQuery: undefined,
      pagination: ONLY_FIRST_ITEM_PAGINATION,
      skip: true,
    });
    expect(mockUseHostRiskScore).toHaveBeenCalledWith({
      filterQuery: undefined,
      pagination: ONLY_FIRST_ITEM_PAGINATION,
      skip: true,
    });
  });
});
