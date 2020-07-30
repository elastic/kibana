/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    test('it renders the default Host Summary', () => {
      const wrapper = shallow(
        <TestProviders>
          <HostOverview
            anomaliesData={mockAnomalies}
            data={mockData.Hosts.edges[0].node}
            endDate="2019-06-18T06:00:00.000Z"
            id="hostOverview"
            isLoadingAnomaliesData={false}
            loading={false}
            narrowDateRange={jest.fn()}
            startDate="2019-06-15T06:00:00.000Z"
          />
        </TestProviders>
      );

      expect(wrapper.find('HostOverview')).toMatchSnapshot();
    });
  });
});
