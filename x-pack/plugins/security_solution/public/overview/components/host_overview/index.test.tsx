/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import '../../../common/mock/match_media';
import { TestProviders } from '../../../common/mock';

import { HostOverview } from './index';
import { mockData } from './mock';
import { mockAnomalies } from '../../../common/components/ml/mock';
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
  });
});
