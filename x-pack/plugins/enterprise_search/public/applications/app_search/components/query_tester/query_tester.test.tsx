/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiFieldSearch } from '@elastic/eui';

import { SchemaType } from '../../../shared/schema/types';
import { Result } from '../result';

import { QueryTester } from './query_tester';

describe('QueryTester', () => {
  const values = {
    searchQuery: 'foo',
    searchResults: [{ id: { raw: '1' } }, { id: { raw: '2' } }, { id: { raw: '3' } }],
    searchDataLoading: false,
    engine: {
      schema: {
        foo: SchemaType.Text,
      },
    },
  };

  const actions = {
    search: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders with a search box and results', () => {
    const wrapper = shallow(<QueryTester />);
    expect(wrapper.find(EuiFieldSearch).prop('value')).toBe('foo');
    expect(wrapper.find(EuiFieldSearch).prop('isLoading')).toBe(false);
    expect(wrapper.find(Result)).toHaveLength(3);
  });

  it('will update the search term in state when the user updates the search box', () => {
    const wrapper = shallow(<QueryTester />);
    wrapper.find(EuiFieldSearch).simulate('change', { target: { value: 'bar' } });
    expect(actions.search).toHaveBeenCalledWith('bar');
  });

  it('will render an empty prompt when there are no results', () => {
    setMockValues({
      ...values,
      searchResults: [],
    });
    const wrapper = shallow(<QueryTester />);
    wrapper.find(EuiFieldSearch).simulate('change', { target: { value: 'bar' } });
    expect(wrapper.find(Result)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });
});
