/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { IpOverviewType } from '../../../../graphql/types';

import { IpOverviewId } from '.';
import { SelectType } from './select_type';

describe('IP Overview Select direction', () => {
  const mockOnChange = jest.fn();

  describe('rendering', () => {
    test('it renders the select type for IP Overview', () => {
      const wrapper = shallow(
        <SelectType
          id={`${IpOverviewId}-select-type`}
          selectedType={IpOverviewType.source}
          onChangeType={mockOnChange}
          isLoading={false}
        />
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('Functionality works as expected', () => {
    test('when you click on destination, you trigger onChange function', () => {
      const wrapper = mount(
        <SelectType
          id={`${IpOverviewId}-select-type`}
          selectedType={IpOverviewType.source}
          onChangeType={mockOnChange}
          isLoading={false}
        />
      );

      wrapper
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`button#${IpOverviewId}-select-type-destination`)
        .first()
        .simulate('click');

      expect(mockOnChange.mock.calls[0]).toEqual(['destination']);
    });
  });
});
