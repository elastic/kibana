/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiCard,
} from '@elastic/eui';
import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { CardItemsComponent, CardItemsProps } from '.';

describe('Card Items', () => {
  describe('rendering', () => {
    test('it renders loading icons', () => {
      const mockCardItemsData: CardItemsProps = {
        fields: [
          {
            key: 'networkEvents',
            description: 'NETWORK_EVENTS',
            value: null,
          },
        ],
        isLoading: true,
        key: 'mock-key',
      };
      const wrapper = shallow(<CardItemsComponent {...mockCardItemsData} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the default widget', () => {
      const mockCardItemsData: CardItemsProps = {
        fields: [
          {
            key: 'networkEvents',
            description: 'NETWORK_EVENTS',
            value: null,
          },
        ],
        isLoading: false,
        key: 'mock-key',
      };
      const wrapper = shallow(<CardItemsComponent {...mockCardItemsData} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    it('should handle multiple titles', () => {
      const mockCardItemsData: CardItemsProps = {
        fields: [
          {
            key: 'uniqueSourcePrivateIps',
            description: 'UNIQUE_SOURCE_PRIVATE_IPS',
            value: null,
          },
          {
            key: 'uniqueDestinationPrivateIps',
            description: 'UNIQUE_DESTINATION_PRIVATE_IPS',
            value: null,
          },
        ],
        description: 'UNIQUE_PRIVATE_IPS',
        isLoading: false,
        key: 'mock-keys',
      };
      const wrapper = mount(<CardItemsComponent {...mockCardItemsData} />);
      expect(wrapper.find(EuiCard).prop('title')).toHaveLength(2);
    });
  });
});
