/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { render } from '@testing-library/react';
import React from 'react';
import '../../../common/mock/match_media';
import { TestProviders } from '../../../common/mock';

import { HostOverview } from '.';
import { mockData } from './mock';
import { mockAnomalies } from '../../../common/components/ml/mock';
import { useHostRiskScore } from '../../../risk_score/containers/all';

jest.mock('../../../risk_score/containers/all', () => ({
  useHostRiskScore: jest.fn().mockReturnValue([
    true,
    {
      data: [],
      isModuleEnabled: false,
    },
  ]),
}));

describe('Host Summary Component', () => {
  describe('rendering', () => {
    const mockProps = {
      anomaliesData: mockAnomalies,
      data: mockData.Hosts.edges[0].node,
      docValueFields: [],
      endDate: '2019-06-18T06:00:00.000Z',
      id: 'hostOverview',
      indexNames: [],
      isInDetailsSidePanel: false,
      isLoadingAnomaliesData: false,
      loading: false,
      narrowDateRange: jest.fn(),
      startDate: '2019-06-15T06:00:00.000Z',
      hostName: 'testHostName',
    };

    test('it renders the default Host Summary', () => {
      const wrapper = shallow(
        <TestProviders>
          <HostOverview {...mockProps} />
        </TestProviders>
      );

      expect(wrapper.find('HostOverview')).toMatchSnapshot();
    });

    test('it renders the panel view Host Summary', () => {
      const panelViewProps = {
        ...mockProps,
        isInDetailsSidePanel: true,
      };

      const wrapper = shallow(
        <TestProviders>
          <HostOverview {...panelViewProps} />
        </TestProviders>
      );

      expect(wrapper.find('HostOverview')).toMatchSnapshot();
    });

    test('it renders host risk score and level', () => {
      const panelViewProps = {
        ...mockProps,
        isInDetailsSidePanel: true,
      };
      const risk = 'very high hos risk';
      const riskScore = 9999999;

      (useHostRiskScore as jest.Mock).mockReturnValue([
        false,
        {
          data: [
            {
              host: {
                name: 'testHostmame',
              },
              risk,
              risk_stats: {
                rule_risks: [],
                risk_score: riskScore,
              },
            },
          ],
          isModuleEnabled: true,
        },
      ]);

      const { getByTestId } = render(
        <TestProviders>
          <HostOverview {...panelViewProps} />
        </TestProviders>
      );

      expect(getByTestId('host-risk-overview')).toHaveTextContent(risk);
      expect(getByTestId('host-risk-overview')).toHaveTextContent(riskScore.toString());
    });
  });
});
