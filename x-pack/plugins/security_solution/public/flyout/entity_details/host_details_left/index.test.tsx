/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISK_INPUTS_TAB_TEST_ID } from '../../../entity_analytics/components/entity_details_flyout';
import { render } from '@testing-library/react';
import React from 'react';
import { HostDetailsPanel } from '.';
import { TestProviders } from '../../../common/mock';
import type { HostRiskScore } from '../../../../common/search_strategy';
import { RiskSeverity } from '../../../../common/search_strategy';

const riskScore: HostRiskScore = {
  '@timestamp': '2021-08-19T16:00:00.000Z',
  host: {
    name: 'elastic',
    risk: {
      '@timestamp': '2021-08-19T16:00:00.000Z',
      id_field: 'host.name',
      id_value: 'elastic',
      rule_risks: [],
      calculated_score_norm: 100,
      calculated_score: 150,
      category_1_score: 150,
      category_1_count: 1,
      multipliers: [],
      calculated_level: RiskSeverity.Critical,
      inputs: [],
      notes: [],
    },
  },
};
const mockUseRiskScore = jest.fn().mockReturnValue({ loading: false, data: [riskScore] });

jest.mock('../../../entity_analytics/api/hooks/use_risk_score', () => ({
  useRiskScore: () => mockUseRiskScore(),
}));

describe('HostDetailsPanel', () => {
  it('render risk inputs panel', () => {
    const { getByTestId } = render(
      <HostDetailsPanel name="elastic" isRiskScoreExist={true} scopeId={'scopeId'} />,
      {
        wrapper: TestProviders,
      }
    );
    expect(getByTestId(RISK_INPUTS_TAB_TEST_ID)).toBeInTheDocument();
  });

  it("doesn't render risk inputs panel when no alerts ids are provided", () => {
    const { queryByTestId } = render(
      <HostDetailsPanel name="elastic" isRiskScoreExist={false} scopeId={'scopeId'} />,
      {
        wrapper: TestProviders,
      }
    );
    expect(queryByTestId(RISK_INPUTS_TAB_TEST_ID)).not.toBeInTheDocument();
  });
});
