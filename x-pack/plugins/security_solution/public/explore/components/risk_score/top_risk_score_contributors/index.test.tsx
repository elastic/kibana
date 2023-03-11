/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TopRiskScoreContributors } from '.';
import { TestProviders } from '../../../../common/mock';
import type { RuleRisk } from '../../../../../common/search_strategy';

jest.mock('../../../../common/containers/query_toggle');
jest.mock('../../../containers/risk_score');
const testProps = {
  riskScore: [],
  setQuery: jest.fn(),
  deleteQuery: jest.fn(),
  hostName: 'test-host-name',
  from: '2020-07-07T08:20:18.966Z',
  to: '2020-07-08T08:20:18.966Z',
  loading: false,
  toggleStatus: true,
  queryId: 'test-query-id',
};

describe('Top Risk Score Contributors', () => {
  it('renders', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <TopRiskScoreContributors {...testProps} />
      </TestProviders>
    );

    expect(queryByTestId('topRiskScoreContributors')).toBeInTheDocument();
  });

  it('renders sorted items', () => {
    const ruleRisk: RuleRisk[] = [
      {
        rule_name: 'third',
        rule_risk: 10,
        rule_id: '3',
      },
      {
        rule_name: 'first',
        rule_risk: 99,
        rule_id: '1',
      },
      {
        rule_name: 'second',
        rule_risk: 55,
        rule_id: '2',
      },
    ];

    const { queryAllByRole } = render(
      <TestProviders>
        <TopRiskScoreContributors {...testProps} rules={ruleRisk} />
      </TestProviders>
    );

    expect(queryAllByRole('row')[1]).toHaveTextContent('first');
    expect(queryAllByRole('row')[2]).toHaveTextContent('second');
    expect(queryAllByRole('row')[3]).toHaveTextContent('third');
  });

  describe('toggleStatus', () => {
    test('toggleStatus=true, render components', () => {
      const { queryByTestId } = render(
        <TestProviders>
          <TopRiskScoreContributors {...testProps} toggleStatus={true} />
        </TestProviders>
      );
      expect(queryByTestId('topRiskScoreContributors-table')).toBeTruthy();
    });

    test('toggleStatus=false, do not render components', () => {
      const { queryByTestId } = render(
        <TestProviders>
          <TopRiskScoreContributors {...testProps} toggleStatus={false} />
        </TestProviders>
      );
      expect(queryByTestId('topRiskScoreContributors-table')).toBeFalsy();
    });
  });
});
