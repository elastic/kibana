/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ContextsTable } from './contexts_table';
import type { UserRiskScore } from '../../../../../../common/search_strategy';
import { RiskLevels } from '../../../../../../common/entity_analytics/risk_engine';

describe('ContextsTable', () => {
  it('renders the correct criticality when the risk has a criticality_level', () => {
    const riskScore: UserRiskScore = {
      '@timestamp': '2021-08-05T15:00:00.000Z',
      user: {
        name: 'elastic',
        risk: {
          '@timestamp': '2023-02-15T00:15:19.231Z',
          id_field: 'host.name',
          id_value: 'hostname',
          calculated_level: RiskLevels.high,
          calculated_score: 149,
          calculated_score_norm: 85.332,
          category_1_score: 85,
          category_1_count: 12,
          category_2_count: 0,
          category_2_score: 0,
          criticality_level: 'very_important',
          criticality_modifier: 2,
          notes: [],
          inputs: [],
          rule_risks: [],
          multipliers: [],
        },
      },
    };

    render(<ContextsTable riskScore={riskScore} loading={false} />);

    expect(screen.getByText('Asset Criticality Level')).toBeInTheDocument();
    expect(screen.getByTestId('risk-inputs-asset-criticality-badge')).toBeInTheDocument();
    expect(screen.getByText('Very important')).toBeInTheDocument();
  });

  it('renders the correct criticality when the risk does not have a criticality_level', () => {
    const riskScore: UserRiskScore = {
      '@timestamp': '2021-08-05T15:00:00.000Z',
      user: {
        name: 'elastic',
        risk: {
          '@timestamp': '2023-02-15T00:15:19.231Z',
          id_field: 'host.name',
          id_value: 'hostname',
          calculated_level: RiskLevels.high,
          calculated_score: 149,
          calculated_score_norm: 85.332,
          category_1_score: 85,
          category_1_count: 12,
          category_2_count: 0,
          category_2_score: 0,
          criticality_modifier: 2,
          notes: [],
          inputs: [],
          rule_risks: [],
          multipliers: [],
        },
      },
    };

    render(<ContextsTable riskScore={riskScore} loading={false} />);

    expect(screen.getByText('Asset Criticality Level')).toBeInTheDocument();
    expect(screen.getByTestId('risk-inputs-asset-criticality-badge')).toBeInTheDocument();
    expect(screen.getByText('Criticality Unassigned')).toBeInTheDocument();
  });
});
