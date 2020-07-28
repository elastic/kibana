/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { FlowDirection } from '../../../graphql/types';

import { FlowDirectionSelect } from './flow_direction_select';

describe('Select Flow Direction', () => {
  const TestFlowDirectionId = 'TestFlowDirectionId';
  const mockOnChange = jest.fn();

  describe('rendering', () => {
    test('it renders the basic group button for uni-direction and bi-direction', () => {
      const wrapper = shallow(
        <FlowDirectionSelect
          selectedDirection={FlowDirection.uniDirectional}
          onChangeDirection={mockOnChange}
        />
      );

      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('Functionality work as expected', () => {
    test('when you click on bi-directional, you trigger onChange function', () => {
      const event = {
        target: {
          name: `${TestFlowDirectionId}-select-flow-direction`,
          value: FlowDirection.biDirectional,
        },
      };
      const wrapper = mount(
        <FlowDirectionSelect
          selectedDirection={FlowDirection.uniDirectional}
          onChangeDirection={mockOnChange}
        />
      );

      wrapper
        .find(`[data-test-subj="${FlowDirection.biDirectional}"]`)
        .first()
        .simulate('click', event);
      wrapper.update();

      expect(mockOnChange.mock.calls[0]).toEqual(['biDirectional']);
    });
  });
});
