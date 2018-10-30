/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as fp from 'lodash/fp';
import * as React from 'react';
import { RangePicker } from './range_picker';
import { Range, Ranges } from './ranges';

describe('RangePicker', () => {
  describe('rendering', () => {
    test('it renders the ranges', () => {
      const wrapper = mount(<RangePicker selected={'1 Week'} onRangeSelected={fp.noop} />);

      Ranges.forEach(range => {
        expect(wrapper.text()).toContain(range);
      });
    });

    test('it selects the option specified by the "selected" prop', () => {
      const selected: Range = '1 Month';
      const wrapper = mount(<RangePicker selected={selected} onRangeSelected={fp.noop} />);

      expect(wrapper.find('select').props().value).toBe(selected);
    });
  });

  describe('#onRangeSelected', () => {
    test('it invokes the onRangeSelected callback when a new range is selected', () => {
      const oldSelection: Range = '1 Week';
      const newSelection: Range = '1 Day';
      const mockOnRangeSelected = jest.fn();

      const wrapper = mount(
        <RangePicker selected={oldSelection} onRangeSelected={mockOnRangeSelected} />
      );

      wrapper.find('select').simulate('change', { target: { value: newSelection } });

      expect(mockOnRangeSelected).toBeCalledWith(newSelection);
    });
  });
});
