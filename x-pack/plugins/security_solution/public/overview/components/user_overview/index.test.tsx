/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';

import { mockAnomalies } from '../../../common/components/ml/mock';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import type { UserSummaryProps } from '.';
import { UserOverview } from '.';

const defaultProps = {
  data: undefined,
  inspect: null,
  refetch: () => {},
  hasEngineBeenInstalled: true,
  isAuthorized: true,
  loading: false,
};

jest.mock('../../../entity_analytics/api/hooks/use_risk_score');

const mockRiskScore = useRiskScore as jest.Mock;

describe('User Summary Component', () => {
  const mockProps: UserSummaryProps = {
    anomaliesData: mockAnomalies,
    data: {
      user: {
        id: ['aa7ca589f1b8220002f2fc61c64cfbf1'],
        name: ['username'],
        domain: ['domain'],
      },
      host: {
        ip: ['10.142.0.7', 'fe80::4001:aff:fe8e:7'],
        os: {
          family: ['debian'],
          name: ['Debian GNU/Linux'],
        },
      },
    },
    endDate: '2019-06-18T06:00:00.000Z',
    id: 'userOverview',
    isInDetailsSidePanel: false,
    isLoadingAnomaliesData: false,
    loading: false,
    narrowDateRange: jest.fn(),
    startDate: '2019-06-15T06:00:00.000Z',
    userName: 'testUserName',
    indexPatterns: [],
    jobNameById: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRiskScore.mockReturnValue({
      ...defaultProps,
      loading: true,
      hasEngineBeenInstalled: false,
    });
  });

  test('it renders the default User Summary', () => {
    const wrapper = shallow(
      <TestProviders>
        <UserOverview {...mockProps} />
      </TestProviders>
    );

    expect(wrapper.find('UserOverview')).toMatchSnapshot();
  });

  test('it renders the panel view User Summary', () => {
    const panelViewProps = {
      ...mockProps,
      isInDetailsSidePanel: true,
    };

    const wrapper = shallow(
      <TestProviders>
        <UserOverview {...panelViewProps} />
      </TestProviders>
    );

    expect(wrapper.find('UserOverview')).toMatchSnapshot();
  });

  test('it renders user risk score and level', () => {
    const panelViewProps = {
      ...mockProps,
      isInDetailsSidePanel: true,
    };
    const risk = 'very high hos risk';
    const riskScore = 9999999;

    mockRiskScore.mockReturnValue({
      ...defaultProps,
      data: [
        {
          user: {
            name: 'testUsername',
            risk: {
              rule_risks: [],
              calculated_level: risk,
              calculated_score_norm: riskScore,
            },
          },
        },
      ],
    });

    const { getByTestId } = render(
      <TestProviders>
        <UserOverview {...panelViewProps} />
      </TestProviders>
    );

    expect(getByTestId('user-risk-overview')).toHaveTextContent(risk);
    expect(getByTestId('user-risk-overview')).toHaveTextContent(riskScore.toString());
  });
});
