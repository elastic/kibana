/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { FlowDirection, FlowTarget } from '../../graphql/types';

import { SelectFlowTarget } from './select_flow_target';

describe('Select Flow Target', () => {
  const TestFlowTargetId = 'TestFlowTargetId';
  const mockOnChange = jest.fn();

  describe('rendering', () => {
    test('it renders the SelectFlowTarget', () => {
      const wrapper = shallow(
        <SelectFlowTarget
          id={TestFlowTargetId}
          selectedDirection={FlowDirection.biDirectional}
          selectedTarget={FlowTarget.source}
          onChangeTarget={mockOnChange}
          isLoading={false}
        />
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('Functionality work as expected', () => {
    test('when you click on destination, you trigger onChange function', () => {
      const wrapper = mount(
        <SelectFlowTarget
          id={TestFlowTargetId}
          selectedDirection={FlowDirection.uniDirectional}
          selectedTarget={FlowTarget.source}
          onChangeTarget={mockOnChange}
          isLoading={false}
        />
      );

      wrapper
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`button#${TestFlowTargetId}-select-flow-target-destination`)
        .first()
        .simulate('click');

      wrapper.update();

      expect(mockOnChange.mock.calls[0]).toEqual(['destination']);
    });

    test('when selectedDirection=unidirectional only source/destination are options', () => {
      const wrapper = mount(
        <SelectFlowTarget
          id={TestFlowTargetId}
          selectedDirection={FlowDirection.uniDirectional}
          selectedTarget={FlowTarget.source}
          onChangeTarget={mockOnChange}
          isLoading={false}
        />
      );

      wrapper
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      expect(
        wrapper.find(`button#${TestFlowTargetId}-select-flow-target-source`).exists()
      ).toBeTruthy();
      expect(
        wrapper.find(`button#${TestFlowTargetId}-select-flow-target-destination`).exists()
      ).toBeTruthy();
      expect(
        wrapper.find(`button#${TestFlowTargetId}-select-flow-target-client`).exists()
      ).toBeFalsy();
      expect(
        wrapper.find(`button#${TestFlowTargetId}-select-flow-target-server`).exists()
      ).toBeFalsy();
    });

    test('when selectedDirection=bidirectional source/destination/client/server are options', () => {
      const wrapper = mount(
        <SelectFlowTarget
          id={TestFlowTargetId}
          selectedDirection={FlowDirection.biDirectional}
          selectedTarget={FlowTarget.source}
          onChangeTarget={mockOnChange}
          isLoading={false}
        />
      );

      wrapper
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      expect(
        wrapper.find(`button#${TestFlowTargetId}-select-flow-target-source`).exists()
      ).toBeTruthy();
      expect(
        wrapper.find(`button#${TestFlowTargetId}-select-flow-target-destination`).exists()
      ).toBeTruthy();
      expect(
        wrapper.find(`button#${TestFlowTargetId}-select-flow-target-client`).exists()
      ).toBeTruthy();
      expect(
        wrapper.find(`button#${TestFlowTargetId}-select-flow-target-server`).exists()
      ).toBeTruthy();
    });
  });
});
