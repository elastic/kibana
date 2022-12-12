/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import { EntityAnalyticsRiskScores } from '.';
import type { UserRiskScore } from '../../../../../common/search_strategy';
import { RiskScoreEntity, RiskSeverity } from '../../../../../common/search_strategy';
import type { SeverityCount } from '../../../../explore/components/risk_score/severity/types';
import { useRiskScore, useRiskScoreKpi } from '../../../../explore/containers/risk_score';
import { openAlertsFilter } from '../../detection_response/utils';

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
  loading: false,
};
const mockUseRiskScore = useRiskScore as jest.Mock;
const mockUseRiskScoreKpi = useRiskScoreKpi as jest.Mock;
jest.mock('../../../../explore/containers/risk_score');

const mockOpenTimelineWithFilters = jest.fn();
jest.mock('../../detection_response/hooks/use_navigate_to_timeline', () => {
  return {
    useNavigateToTimeline: () => ({
      openTimelineWithFilters: mockOpenTimelineWithFilters,
    }),
  };
});

jest.mock('../../../../common/components/hover_actions', () => ({ HoverActions: () => null }));

describe.each([RiskScoreEntity.host, RiskScoreEntity.user])(
  'EntityAnalyticsRiskScores entityType: %s',
  (riskEntity) => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseRiskScoreKpi.mockReturnValue({
        severityCount: mockSeverityCount,
        loading: false,
      });
      mockUseRiskScore.mockReturnValue(defaultProps);
    });

    it('renders enable button when module is disable', () => {
      mockUseRiskScore.mockReturnValue({ ...defaultProps, isModuleEnabled: false });
      const { getByTestId } = render(
        <TestProviders>
          <EntityAnalyticsRiskScores riskEntity={riskEntity} />
        </TestProviders>
      );

      expect(getByTestId(`enable_${riskEntity}_risk_score`)).toBeInTheDocument();
    });

    it("doesn't render enable button when module is enable", () => {
      const { queryByTestId } = render(
        <TestProviders>
          <EntityAnalyticsRiskScores riskEntity={riskEntity} />
        </TestProviders>
      );

      expect(queryByTestId(`enable_${riskEntity}_risk_score`)).not.toBeInTheDocument();
    });

    it('queries when toggleStatus is true', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
      render(
        <TestProviders>
          <EntityAnalyticsRiskScores riskEntity={riskEntity} />
        </TestProviders>
      );

      expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(false);
    });

    it('skips query when toggleStatus is false', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
      render(
        <TestProviders>
          <EntityAnalyticsRiskScores riskEntity={riskEntity} />
        </TestProviders>
      );
      expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(true);
    });

    it('renders components when toggleStatus is true', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
      const { queryByTestId } = render(
        <TestProviders>
          <EntityAnalyticsRiskScores riskEntity={riskEntity} />
        </TestProviders>
      );

      expect(queryByTestId('entity_analytics_content')).toBeInTheDocument();
    });

    it('does not render components when toggleStatus is false', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
      const { queryByTestId } = render(
        <TestProviders>
          <EntityAnalyticsRiskScores riskEntity={riskEntity} />
        </TestProviders>
      );

      expect(queryByTestId('entity_analytics_content')).not.toBeInTheDocument();
    });

    it('renders alerts count', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
      mockUseRiskScoreKpi.mockReturnValue({
        severityCount: mockSeverityCount,
        loading: false,
      });
      const alertsCount = 999;
      const data: UserRiskScore[] = [
        {
          '@timestamp': '1234567899',
          user: {
            name: 'testUsermame',
            risk: {
              rule_risks: [],
              calculated_level: RiskSeverity.high,
              calculated_score_norm: 75,
              multipliers: [],
            },
          },
          alertsCount,
        },
      ];
      mockUseRiskScore.mockReturnValue({ ...defaultProps, data });

      const { queryByTestId } = render(
        <TestProviders>
          <EntityAnalyticsRiskScores riskEntity={riskEntity} />
        </TestProviders>
      );

      expect(queryByTestId('risk-score-alerts')).toHaveTextContent(alertsCount.toString());
    });

    it('navigates to timeline with filters when alerts count is clicked', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
      mockUseRiskScoreKpi.mockReturnValue({
        severityCount: mockSeverityCount,
        loading: false,
      });
      const name = 'testName';
      const data = [
        {
          '@timestamp': '1234567899',
          [riskEntity]: {
            name,
            risk: {
              rule_risks: [],
              calculated_level: RiskSeverity.high,
              calculated_score_norm: 75,
              multipliers: [],
            },
          },
          alertsCount: 999,
        },
      ];
      mockUseRiskScore.mockReturnValue({ ...defaultProps, data });

      const { getByTestId } = render(
        <TestProviders>
          <EntityAnalyticsRiskScores riskEntity={riskEntity} />
        </TestProviders>
      );

      fireEvent.click(getByTestId('risk-score-alerts'));

      expect(mockOpenTimelineWithFilters.mock.calls[0][0]).toEqual([
        [
          {
            field: riskEntity === RiskScoreEntity.host ? 'host.name' : 'user.name',
            value: name,
          },
          openAlertsFilter,
        ],
      ]);
    });
  }
);
