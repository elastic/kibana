/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TopHostScoreContributors } from '.';
import { TestProviders } from '../../../common/mock';
import { useHostRiskScore } from '../../containers/host_risk_score';

jest.mock('../../containers/host_risk_score');
const useHostRiskScoreMock = useHostRiskScore as jest.Mock;

describe('Host Risk Flyout', () => {
  it('renders', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <TopHostScoreContributors
          hostName={'test-host-name'}
          from={'2020-07-07T08:20:18.966Z'}
          to={'2020-07-08T08:20:18.966Z'}
        />
      </TestProviders>
    );

    expect(queryByTestId('topHostScoreContributors')).toBeInTheDocument();
  });

  it('renders sorted items', () => {
    useHostRiskScoreMock.mockReturnValueOnce({
      loading: true,
      isModuleEnabled: true,
      result: [
        {
          risk_stats: {
            rule_risks: [
              {
                rule_name: 'third',
                rule_risk: '10',
              },
              {
                rule_name: 'first',
                rule_risk: '99',
              },
              {
                rule_name: 'second',
                rule_risk: '55',
              },
            ],
          },
        },
      ],
    });

    const { queryAllByRole } = render(
      <TestProviders>
        <TopHostScoreContributors
          hostName={'test-host-name'}
          from={'2020-07-07T08:20:18.966Z'}
          to={'2020-07-08T08:20:18.966Z'}
        />
      </TestProviders>
    );

    expect(queryAllByRole('row')[1]).toHaveTextContent('first');
    expect(queryAllByRole('row')[2]).toHaveTextContent('second');
    expect(queryAllByRole('row')[3]).toHaveTextContent('third');
  });
});
