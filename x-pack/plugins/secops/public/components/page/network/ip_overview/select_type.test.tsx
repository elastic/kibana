/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
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
});
