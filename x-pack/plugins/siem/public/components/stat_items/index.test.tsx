/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow, ReactWrapper } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { StatItemsComponent, StatItemsProps } from '.';
import { BarChart } from './barchart';
import { AreaChart } from './areachart';
import { EuiHorizontalRule } from '@elastic/eui';

describe('Stat Items', () => {
  describe('loading', () => {
    test('it renders loading icons', () => {
      const mockStatItemsData: StatItemsProps = {
        fields: [
          {
            key: 'networkEvents',
            description: 'NETWORK_EVENTS',
            value: null,
            color: '#000000'
          },
        ],
        isLoading: true,
        key: 'mock-key',
      };
      const wrapper = shallow(<StatItemsComponent {...mockStatItemsData} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });

  });

  describe('rendering', () => {
    const mockStatItemsData: StatItemsProps = {
      fields: [
        {
          key: 'uniqueSourcePrivateIps',
          description: 'UNIQUE_SOURCE_PRIVATE_IPS',
          value: null,
          color: '#000000',
        },
        {
          key: 'uniqueDestinationPrivateIps',
          description: 'UNIQUE_DESTINATION_PRIVATE_IPS',
          value: null,
          color: '#000000',
        },
      ],
      areaChart: [
        {
          key: 'uniqueSourcePrivateIps',
          value: null,
          color: '#000000',
        },
        {
          key: 'uniqueDestinationPrivateIps',
          value: null,
          color: '#000000',
        },
      ],
      barChart: [
        {
          key: 'uniqueSourcePrivateIps',
          value: null,
          color: '#000000',
        },
        {
          key: 'uniqueDestinationPrivateIps',
          value: null,
          color: '#000000',
        },
      ],
      description: 'UNIQUE_PRIVATE_IPS',
      isLoading: false,
      key: 'mock-keys',
    };
    let wrapper: ReactWrapper;
    beforeAll(() => {
      
      wrapper = mount(<StatItemsComponent {...mockStatItemsData} />);
    })
    test('it renders the default widget', () => {
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('should handle multiple titles', () => {
      expect(wrapper.find('[data-test-subj="stat-title"]')).toHaveLength(2);
    });

    test('should render barChart', () => {
      
      expect(wrapper.find(BarChart)).toHaveLength(1);
    });

    test('should render areaChart', () => {
      expect(wrapper.find(AreaChart)).toHaveLength(1);
    });

    test('should render spliter', () => {    
      expect(wrapper.find(EuiHorizontalRule)).toHaveLength(1);
    });
  });
});
