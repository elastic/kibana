/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea.mock';

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { EuiFieldSearch } from '@elastic/eui';

import { RelevanceTuningForm } from './relevance_tuning_form';

describe('RelevanceTuningForm', () => {
  const values = {
    filterInputValue: '',
    schemaFields: [],
    filteredSchemaFields: [],
  };
  const actions = {
    setFilterValue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  describe('field filtering', () => {
    let searchField: ShallowWrapper;

    beforeEach(() => {
      setMockValues({
        ...values,
        filterInputValue: 'test',
        schemaFields: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
      });
      const wrapper = shallow(<RelevanceTuningForm />);
      searchField = wrapper.find(EuiFieldSearch);
    });

    it('renders an input box for filtering the field list in case there is a large quantity of fields', () => {
      expect(searchField.exists()).toBe(true);
    });

    it('initializes the input box with the user input value stored in state', () => {
      expect(searchField.prop('value')).toBe('test');
    });

    it('updates the user input value stored in state whenever the input box value changes', () => {
      searchField.simulate('change', {
        target: {
          value: 'new value',
        },
      });

      expect(actions.setFilterValue).toHaveBeenCalledWith('new value');
    });

    it('will not render a field filter if there are 10 or less fields', () => {
      setMockValues({
        ...values,
        schemaFields: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      });
      const wrapper = shallow(<RelevanceTuningForm />);
      expect(wrapper.find(EuiFieldSearch).exists()).toBe(false);
    });
  });
});
