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
import { useHostsRiskScore } from '../../../common/containers/hosts_risk/use_hosts_risk_score';

jest.mock('../../../common/containers/hosts_risk/use_hosts_risk_score');
const useHostsRiskScoreMock = useHostsRiskScore as jest.Mock;

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
    useHostsRiskScoreMock.mockReturnValueOnce({
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
