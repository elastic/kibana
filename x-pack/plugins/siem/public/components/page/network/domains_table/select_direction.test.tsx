/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { NetworkTopNFlowDirection } from '../../../../graphql/types';

import { DomainsTableId } from '.';
import { SelectDirection } from './select_direction';

describe('NetworkTopNFlow Select direction', () => {
  const mockOnChange = jest.fn();

  describe('rendering', () => {
    test('it renders the basic group button for uni-direction and bi-direction', () => {
      const wrapper = shallow(
        <SelectDirection
          id={`${DomainsTableId}-select-direction`}
          selectedDirection={NetworkTopNFlowDirection.uniDirectional}
          onChangeDirection={mockOnChange}
        />
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('Functionality work as expected', () => {
    test('when you click on bi-directional, you trigger onChange function', () => {
      const event = {
        target: {
          name: `${DomainsTableId}-select-direction`,
          value: NetworkTopNFlowDirection.biDirectional,
        },
      };
      const wrapper = mount(
        <SelectDirection
          id={`${DomainsTableId}-select-direction`}
          selectedDirection={NetworkTopNFlowDirection.uniDirectional}
          onChangeDirection={mockOnChange}
        />
      );

      wrapper
        .find('input[value="biDirectional"]')
        .first()
        .simulate('change', event);
      wrapper.update();

      expect(mockOnChange.mock.calls[0]).toEqual([
        `${DomainsTableId}-select-direction-biDirectional`,
        'biDirectional',
      ]);
    });
  });
});
