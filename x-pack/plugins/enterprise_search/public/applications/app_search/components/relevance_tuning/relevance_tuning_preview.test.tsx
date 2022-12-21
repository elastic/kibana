/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldSearch } from '@elastic/eui';

import { Result } from '../result/result';

import { RelevanceTuningPreview } from './relevance_tuning_preview';

describe('RelevanceTuningPreview', () => {
  const result1 = { id: { raw: 1 } };
  const result2 = { id: { raw: 2 } };
  const result3 = { id: { raw: 3 } };

  const actions = {
    setSearchQuery: jest.fn(),
  };

  const values = {
    searchResults: [result1, result2, result3],
    engineName: 'foo',
    isMetaEngine: false,
    schema: {},
  };

  beforeAll(() => {
    setMockActions(actions);
    setMockValues(values);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<RelevanceTuningPreview />);

    expect(wrapper.find(EuiFieldSearch).prop('placeholder')).toBe('Search foo');

    const results = wrapper.find(Result);
    expect(results.length).toBe(3);
    expect(results.at(0).prop('result')).toBe(result1);
    expect(results.at(0).prop('isMetaEngine')).toBe(false);
    expect(results.at(0).prop('showScore')).toBe(true);
    expect(results.at(0).prop('schemaForTypeHighlights')).toBe(values.schema);

    expect(results.at(1).prop('result')).toBe(result2);
    expect(results.at(2).prop('result')).toBe(result3);

    expect(wrapper.find('[data-test-subj="EmptyQueryPrompt"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-subj="NoResultsPrompt"]').exists()).toBe(false);
  });

  it('correctly indicates whether or not this is a meta engine in results', () => {
    setMockValues({
      ...values,
      isMetaEngine: true,
    });

    const wrapper = shallow(<RelevanceTuningPreview />);

    const results = wrapper.find(Result);
    expect(results.at(0).prop('isMetaEngine')).toBe(true);
    expect(results.at(1).prop('isMetaEngine')).toBe(true);
    expect(results.at(2).prop('isMetaEngine')).toBe(true);
  });

  it('renders a search box that will update search results whenever it is changed', () => {
    const wrapper = shallow(<RelevanceTuningPreview />);

    wrapper.find(EuiFieldSearch).simulate('change', { target: { value: 'some search text' } });

    expect(actions.setSearchQuery).toHaveBeenCalledWith('some search text');
  });

  it('will show user a prompt to enter a query if they have not entered one', () => {
    setMockValues({
      ...values,
      // Since `searchResults` is initialized as undefined, an undefined value indicates
      // that no query has been performed, which means they have no yet entered a query
      searchResults: undefined,
    });

    const wrapper = shallow(<RelevanceTuningPreview />);

    expect(wrapper.find('[data-test-subj="EmptyQueryPrompt"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="NoResultsPrompt"]').exists()).toBe(false);
  });

  it('will show user a no results message if their query returns no results', () => {
    setMockValues({
      ...values,
      searchResults: [],
    });

    const wrapper = shallow(<RelevanceTuningPreview />);

    expect(wrapper.find('[data-test-subj="EmptyQueryPrompt"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-subj="NoResultsPrompt"]').exists()).toBe(true);
  });
});
