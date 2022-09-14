/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render } from '@testing-library/react';
import { TestProviders } from '../../../mock';
import { NO_HOST_RISK_DATA_DESCRIPTION } from './translations';
import { HostRiskSummary } from './host_risk_summary';
import { RiskSeverity } from '../../../../../common/search_strategy';

describe('HostRiskSummary', () => {
  it('renders host risk data', () => {
    const riskSeverity = RiskSeverity.low;
    const hostRisk = {
      loading: false,
      isModuleEnabled: true,
      result: [
        {
          '@timestamp': '1641902481',
          host: {
            name: 'test-host-name',
            risk: {
              multipliers: [],
              calculated_score_norm: 9999,
              calculated_level: riskSeverity,
              rule_risks: [],
            },
          },
        },
      ],
    };

    const { getByText } = render(
      <TestProviders>
        <HostRiskSummary hostRisk={hostRisk} />
      </TestProviders>
    );

    expect(getByText(riskSeverity)).toBeInTheDocument();
  });

  it('renders spinner when loading', () => {
    const hostRisk = {
      loading: true,
      isModuleEnabled: true,
      result: [],
    };

    const { getByTestId } = render(
      <TestProviders>
        <HostRiskSummary hostRisk={hostRisk} />
      </TestProviders>
    );

    expect(getByTestId('loading')).toBeInTheDocument();
  });

  it('renders no host data message when module is diabled', () => {
    const hostRisk = {
      loading: false,
      isModuleEnabled: false,
      result: [
        {
          '@timestamp': '1641902530',
          host: {
            name: 'test-host-name',
            risk: {
              multipliers: [],
              calculated_score_norm: 9999,
              calculated_level: RiskSeverity.low,
              rule_risks: [],
            },
          },
        },
      ],
    };

    const { getByText } = render(
      <TestProviders>
        <HostRiskSummary hostRisk={hostRisk} />
      </TestProviders>
    );

    expect(getByText(NO_HOST_RISK_DATA_DESCRIPTION)).toBeInTheDocument();
  });

  it('renders no host data message when there is no host data', () => {
    const hostRisk = {
      loading: false,
      isModuleEnabled: true,
      result: [],
    };

    const { getByText } = render(
      <TestProviders>
        <HostRiskSummary hostRisk={hostRisk} />
      </TestProviders>
    );

    expect(getByText(NO_HOST_RISK_DATA_DESCRIPTION)).toBeInTheDocument();
  });
});
