/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { RiskScoreOverTime } from '.';
import { TestProviders } from '../../mock';

describe('Host Risk Flyout', () => {
  it('renders', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RiskScoreOverTime
          riskScore={[]}
          loading={false}
          from={'2020-07-07T08:20:18.966Z'}
          to={'2020-07-08T08:20:18.966Z'}
          queryId={'test_query_id'}
          title={'test_query_title'}
        />
      </TestProviders>
    );

    expect(queryByTestId('RiskScoreOverTime')).toBeInTheDocument();
  });

  it('renders loader when loading', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RiskScoreOverTime
          loading={true}
          from={'2020-07-07T08:20:18.966Z'}
          to={'2020-07-08T08:20:18.966Z'}
          queryId={'test_query_id'}
          title={'test_query_title'}
        />
      </TestProviders>
    );

    expect(queryByTestId('RiskScoreOverTime-loading')).toBeInTheDocument();
  });
});
