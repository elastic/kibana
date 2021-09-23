/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCodeBlock, EuiFieldSearch } from '@elastic/eui';

import { SampleResponse } from './sample_response';

describe('SampleResponse', () => {
  const actions = {
    queryChanged: jest.fn(),
    getSearchResults: jest.fn(),
  };

  const values = {
    reducedServerResultFields: {},
    query: 'foo',
    response: {
      bar: 'baz',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
    setMockValues(values);
  });

  it('renders a text box with the current user "query" value from state', () => {
    const wrapper = shallow(<SampleResponse />);
    expect(wrapper.find(EuiFieldSearch).prop('value')).toEqual('foo');
  });

  it('updates the "query" value in state when a user updates the text in the text box', () => {
    const wrapper = shallow(<SampleResponse />);
    wrapper.find(EuiFieldSearch).simulate('change', { target: { value: 'bar' } });
    expect(actions.queryChanged).toHaveBeenCalledWith('bar');
  });

  it('will call getSearchResults with the current value of query and reducedServerResultFields in a useEffect, which updates the displayed response', () => {
    const wrapper = shallow(<SampleResponse />);
    expect(wrapper.find(EuiFieldSearch).prop('value')).toEqual('foo');
  });

  it('renders the response from the given user "query" in a code block', () => {
    const wrapper = shallow(<SampleResponse />);
    expect(wrapper.find(EuiCodeBlock).prop('children')).toEqual('{\n  "bar": "baz"\n}');
  });

  it('renders a plain old string in the code block if the response is a string', () => {
    setMockValues({
      response: 'No results.',
    });
    const wrapper = shallow(<SampleResponse />);
    expect(wrapper.find(EuiCodeBlock).prop('children')).toEqual('No results.');
  });

  it('will not render a code block at all if there is no response yet', () => {
    setMockValues({
      response: null,
    });
    const wrapper = shallow(<SampleResponse />);
    expect(wrapper.find(EuiCodeBlock).exists()).toEqual(false);
  });
});
