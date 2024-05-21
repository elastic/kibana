/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../../common/mock';
import { times } from 'lodash/fp';
import { RiskInputsTab } from './risk_inputs_tab';
import { alertInputDataMock } from '../../mocks';
import { RiskSeverity } from '../../../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../../../common/entity_analytics/risk_engine';

const mockUseRiskContributingAlerts = jest.fn().mockReturnValue({ loading: false, data: [] });

jest.mock('../../../../hooks/use_risk_contributing_alerts', () => ({
  useRiskContributingAlerts: () => mockUseRiskContributingAlerts(),
}));

const mockUseUiSetting = jest.fn().mockReturnValue([false]);

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useUiSetting$: () => mockUseUiSetting(),
  };
});

const mockUseRiskScore = jest.fn().mockReturnValue({ loading: false, data: [] });

jest.mock('../../../../api/hooks/use_risk_score', () => ({
  useRiskScore: () => mockUseRiskScore(),
}));

const riskScore = {
  '@timestamp': '2021-08-19T16:00:00.000Z',
  user: {
    name: 'elastic',
    risk: {
      rule_risks: [],
      calculated_score_norm: 100,
      multipliers: [],
      calculated_level: RiskSeverity.Critical,
    },
  },
};

const riskScoreWithAssetCriticalityContribution = (contribution: number) => {
  const score = JSON.parse(JSON.stringify(riskScore));
  score.user.risk.category_2_score = contribution;
  return score;
};

describe('RiskInputsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    mockUseRiskContributingAlerts.mockReturnValue({
      loading: false,
      error: false,
      data: [alertInputDataMock],
    });
    mockUseRiskScore.mockReturnValue({
      loading: false,
      error: false,
      data: [riskScore],
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <RiskInputsTab entityType={RiskScoreEntity.user} entityName="elastic" />
      </TestProviders>
    );

    expect(queryByTestId('risk-input-asset-criticality-title')).not.toBeInTheDocument();
    expect(getByTestId('risk-input-table-description-cell')).toHaveTextContent('Rule Name');
  });

  it('Does not render the context section if enabled but no asset criticality', () => {
    mockUseUiSetting.mockReturnValue([true]);

    const { queryByTestId } = render(
      <TestProviders>
        <RiskInputsTab entityType={RiskScoreEntity.user} entityName="elastic" />
      </TestProviders>
    );

    expect(queryByTestId('risk-input-asset-criticality-title')).not.toBeInTheDocument();
  });

  it('Renders the context section if enabled and risks contains asset criticality', () => {
    mockUseUiSetting.mockReturnValue([true]);

    const riskScoreWithAssetCriticality = {
      '@timestamp': '2021-08-19T16:00:00.000Z',
      user: {
        name: 'elastic',
        risk: {
          ...riskScore.user.risk,
          criticality_level: 'extreme_impact',
        },
      },
    };

    mockUseRiskScore.mockReturnValue({
      loading: false,
      error: false,
      data: [riskScoreWithAssetCriticality],
    });

    const { queryByTestId } = render(
      <TestProviders>
        <RiskInputsTab entityType={RiskScoreEntity.user} entityName="elastic" />
      </TestProviders>
    );

    expect(queryByTestId('risk-input-contexts-title')).toBeInTheDocument();
  });

  it('Displays 0.00 for the asset criticality contribution if the contribution value is less than -0.01', () => {
    mockUseUiSetting.mockReturnValue([true]);

    mockUseRiskScore.mockReturnValue({
      loading: false,
      error: false,
      data: [riskScoreWithAssetCriticalityContribution(-0.0000001)],
    });

    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsTab entityType={RiskScoreEntity.user} entityName="elastic" />
      </TestProviders>
    );
    const contextsTable = getByTestId('risk-input-contexts-table');
    expect(contextsTable).not.toHaveTextContent('-0.00');
    expect(contextsTable).toHaveTextContent('0.00');
  });

  it('Displays 0.00 for the asset criticality contribution if the contribution value is less than 0.01', () => {
    mockUseUiSetting.mockReturnValue([true]);

    mockUseRiskScore.mockReturnValue({
      loading: false,
      error: false,
      data: [riskScoreWithAssetCriticalityContribution(0.0000001)],
    });

    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsTab entityType={RiskScoreEntity.user} entityName="elastic" />
      </TestProviders>
    );
    const contextsTable = getByTestId('risk-input-contexts-table');
    expect(contextsTable).not.toHaveTextContent('+0.00');
    expect(contextsTable).toHaveTextContent('0.00');
  });

  it('Adds a plus to positive asset criticality contribution scores', () => {
    mockUseUiSetting.mockReturnValue([true]);

    mockUseRiskScore.mockReturnValue({
      loading: false,
      error: false,
      data: [riskScoreWithAssetCriticalityContribution(2.22)],
    });

    const { getByTestId } = render(
      <TestProviders>
        <RiskInputsTab entityType={RiskScoreEntity.user} entityName="elastic" />
      </TestProviders>
    );

    expect(getByTestId('risk-input-contexts-table')).toHaveTextContent('+2.22');
  });

  it('shows extra alerts contribution message', () => {
    const alerts = times(
      (number) => ({
        ...alertInputDataMock,
        _id: number.toString(),
      }),
      11
    );

    mockUseRiskContributingAlerts.mockReturnValue({
      loading: false,
      error: false,
      data: alerts,
    });
    mockUseRiskScore.mockReturnValue({
      loading: false,
      error: false,
      data: [riskScore],
    });

    const { queryByTestId } = render(
      <TestProviders>
        <RiskInputsTab entityType={RiskScoreEntity.user} entityName="elastic" />
      </TestProviders>
    );

    expect(queryByTestId('risk-input-extra-alerts-message')).toBeInTheDocument();
  });
});
