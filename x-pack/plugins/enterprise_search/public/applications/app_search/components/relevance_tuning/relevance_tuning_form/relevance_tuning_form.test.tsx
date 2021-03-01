/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea.mock';

import React from 'react';

import { shallow, mount, ReactWrapper, ShallowWrapper } from 'enzyme';

import { EuiFieldSearch } from '@elastic/eui';

import { BoostType } from '../types';

import { RelevanceTuningForm } from './relevance_tuning_form';
import { RelevanceTuningItem } from './relevance_tuning_item';

describe('RelevanceTuningForm', () => {
  const values = {
    filterInputValue: '',
    schemaFields: ['foo', 'bar', 'baz'],
    filteredSchemaFields: ['foo', 'bar'],
    schema: {
      foo: 'text',
      bar: 'number',
    },
    searchSettings: {
      boosts: {
        foo: [
          {
            factor: 2,
            type: BoostType.Value,
          },
        ],
      },
      search_fields: {
        bar: {
          weight: 1,
        },
      },
    },
  };
  const actions = {
    setFilterValue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
  });

  describe('fields', () => {
    let wrapper: ReactWrapper;
    let relevantTuningItems: any;

    beforeAll(() => {
      setMockValues(values);

      wrapper = mount(<RelevanceTuningForm />);
      relevantTuningItems = wrapper.find(RelevanceTuningItem);
    });

    it('renders a list of fields that may or may not have been filterd by user input', () => {
      // The length is 2 because we're only pulling values from `filteredSchemaFields`, which
      // is the list of schema fields that has been filtered by user input down to 2
      expect(relevantTuningItems.length).toBe(2);
    });

    it('will pass the schema field name in the "name" prop of each list item', () => {
      expect(relevantTuningItems.at(0).prop('name')).toBe('foo');
      expect(relevantTuningItems.at(1).prop('name')).toBe('bar');
    });

    it('will pass the schema type of the field in the "type" prop of each list item', () => {
      expect(relevantTuningItems.at(0).prop('type')).toBe('text');
      expect(relevantTuningItems.at(1).prop('type')).toBe('number');
    });

    it('will pass a list of boosts in the "boosts" field of each list item, or undefined if none exist', () => {
      expect(relevantTuningItems.at(0).prop('boosts')).toEqual([
        {
          factor: 2,
          type: BoostType.Value,
        },
      ]);
      expect(relevantTuningItems.at(1).prop('boosts')).toBeUndefined();
    });

    it('will pass the search_field configuration for the field in the "field" prop of each list item, or undefined if none exists', () => {
      expect(relevantTuningItems.at(0).prop('field')).toBeUndefined();
      expect(relevantTuningItems.at(1).prop('field')).toEqual({
        weight: 1,
      });
    });
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
