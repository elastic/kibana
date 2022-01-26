/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { HostRiskScoreOverTime } from '.';
import { TestProviders } from '../../../common/mock';
import { useHostRiskScore } from '../../containers/host_risk_score';

jest.mock('../../containers/host_risk_score');
const useHostRiskScoreMock = useHostRiskScore as jest.Mock;

describe('Host Risk Flyout', () => {
  it('renders', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <HostRiskScoreOverTime
          hostName={'test-host-name'}
          from={'2020-07-07T08:20:18.966Z'}
          to={'2020-07-08T08:20:18.966Z'}
        />
      </TestProviders>
    );

    expect(queryByTestId('hostRiskScoreOverTime')).toBeInTheDocument();
  });

  it('renders loader when HostsRiskScore is laoding', () => {
    useHostRiskScoreMock.mockReturnValueOnce({
      loading: true,
      isModuleEnabled: true,
      result: [],
    });

    const { queryByTestId } = render(
      <TestProviders>
        <HostRiskScoreOverTime
          hostName={'test-host-name'}
          from={'2020-07-07T08:20:18.966Z'}
          to={'2020-07-08T08:20:18.966Z'}
        />
      </TestProviders>
    );

    expect(queryByTestId('HostRiskScoreOverTime-loading')).toBeInTheDocument();
  });
});
