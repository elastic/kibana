/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { EntityAnalyticsUserRiskScores } from '.';
import { RiskSeverity } from '../../../../../common/search_strategy';
import type { SeverityCount } from '../../../../common/components/severity/types';
import { useUserRiskScore, useUserRiskScoreKpi } from '../../../../risk_score/containers';

const mockSeverityCount: SeverityCount = {
  [RiskSeverity.low]: 1,
  [RiskSeverity.high]: 1,
  [RiskSeverity.moderate]: 1,
  [RiskSeverity.unknown]: 1,
  [RiskSeverity.critical]: 1,
};

const mockUseQueryToggle = jest
  .fn()
  .mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
jest.mock('../../../../common/containers/query_toggle', () => {
  return {
    useQueryToggle: () => mockUseQueryToggle(),
  };
});

const defaultProps = {
  data: undefined,
  inspect: null,
  refetch: () => {},
  isModuleEnabled: true,
  isLicenseValid: true,
};

const mockUseUserRiskScore = useUserRiskScore as jest.Mock;
const mockUseUserRiskScoreKpi = useUserRiskScoreKpi as jest.Mock;
jest.mock('../../../../risk_score/containers');

describe('EntityAnalyticsUserRiskScores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserRiskScoreKpi.mockReturnValue({ severityCount: mockSeverityCount, loading: false });
    mockUseUserRiskScore.mockReturnValue([false, defaultProps]);
  });

  it('renders enable button when module is disable', () => {
    mockUseUserRiskScore.mockReturnValue([false, { ...defaultProps, isModuleEnabled: false }]);
    const { getByTestId } = render(
      <TestProviders>
        <EntityAnalyticsUserRiskScores />
      </TestProviders>
    );

    expect(getByTestId('enable_user_risk_score')).toBeInTheDocument();
  });

  it("doesn't render enable button when module is enable", () => {
    const { queryByTestId } = render(
      <TestProviders>
        <EntityAnalyticsUserRiskScores />
      </TestProviders>
    );

    expect(queryByTestId('enable_user_risk_score')).not.toBeInTheDocument();
  });

  it('queries when toggleStatus is true', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <EntityAnalyticsUserRiskScores />
      </TestProviders>
    );

    expect(mockUseUserRiskScore.mock.calls[0][0].skip).toEqual(false);
  });

  it('skips query when toggleStatus is false', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <EntityAnalyticsUserRiskScores />
      </TestProviders>
    );
    expect(mockUseUserRiskScore.mock.calls[0][0].skip).toEqual(true);
  });

  it('renders components when toggleStatus is true', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    const { queryByTestId } = render(
      <TestProviders>
        <EntityAnalyticsUserRiskScores />
      </TestProviders>
    );

    expect(queryByTestId('entity_analytics_content')).toBeInTheDocument();
  });

  it('does not render components when toggleStatus is false', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    const { queryByTestId } = render(
      <TestProviders>
        <EntityAnalyticsUserRiskScores />
      </TestProviders>
    );

    expect(queryByTestId('entity_analytics_content')).not.toBeInTheDocument();
  });
});
