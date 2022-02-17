/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';
import '../../../../../__mocks__/shallow_useeffect.mock';
import { mockUseParams } from '../../../../../__mocks__/react_router';
import '../../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt } from '@elastic/eui';

import { AppSearchPageTemplate } from '../../../layout';

import { Result } from '../../../result';

import { CurationResultPanel } from './curation_result_panel';
import { CurationSuggestion } from './curation_suggestion';

describe('CurationSuggestion', () => {
  const values = {
    suggestion: {
      query: 'foo',
      updated_at: '2021-07-08T14:35:50Z',
      promoted: [{ id: '4', foo: 'foo' }],
      organic: [
        {
          id: { raw: '3', snippet: null },
          foo: { raw: 'bar', snippet: null },
          _meta: { id: '3' },
        },
      ],
      curation: {
        promoted: [{ id: '1', foo: 'foo' }],
        organic: [
          {
            id: { raw: '5', snippet: null },
            foo: { raw: 'bar', snippet: null },
            _meta: { id: '5' },
          },
          {
            id: { raw: '6', snippet: null },
            foo: { raw: 'bar', snippet: null },
            _meta: { id: '6' },
          },
        ],
      },
    },
    isMetaEngine: true,
    engine: {
      schema: {},
    },
  };

  const actions = {
    loadSuggestion: jest.fn(),
  };

  beforeAll(() => {
    setMockValues(values);
    setMockActions(actions);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ query: 'foo' });
  });

  it('renders', () => {
    const wrapper = shallow(<CurationSuggestion />);

    expect(wrapper.is(AppSearchPageTemplate)).toBe(true);
  });

  it('loads data on initialization', () => {
    shallow(<CurationSuggestion />);
    expect(actions.loadSuggestion).toHaveBeenCalled();
  });

  it('shows existing promoted documents', () => {
    const wrapper = shallow(<CurationSuggestion />);
    const suggestedResultsPanel = wrapper.find(CurationResultPanel).at(0);
    expect(suggestedResultsPanel.prop('results')).toEqual([
      {
        id: {
          raw: '1',
          snippet: null,
        },
        foo: {
          raw: 'foo',
          snippet: null,
        },
        _meta: {
          id: '1',
        },
      },
    ]);
  });

  it('shows suggested promoted documents', () => {
    const wrapper = shallow(<CurationSuggestion />);
    const suggestedResultsPanel = wrapper.find(CurationResultPanel).at(1);
    expect(suggestedResultsPanel.prop('results')).toEqual([
      {
        id: {
          raw: '4',
          snippet: null,
        },
        foo: {
          raw: 'foo',
          snippet: null,
        },
        _meta: {
          id: '4',
        },
      },
    ]);
  });

  it('displays the query in the title', () => {
    const wrapper = shallow(<CurationSuggestion />);

    expect(wrapper.prop('pageHeader').pageTitle).toEqual('foo');
  });

  it('displays has a button to display organic results', () => {
    const wrapper = shallow(<CurationSuggestion />);

    expect(wrapper.find('[data-test-subj="organicResults"]').exists()).toBe(false);
    wrapper.find('[data-test-subj="showOrganicResults"]').simulate('click');
    expect(wrapper.find('[data-test-subj="organicResults"]').exists()).toBe(true);
    wrapper.find('[data-test-subj="showOrganicResults"]').simulate('click');
    expect(wrapper.find('[data-test-subj="organicResults"]').exists()).toBe(false);
  });

  it('displays proposed organic results', () => {
    const wrapper = shallow(<CurationSuggestion />);
    wrapper.find('[data-test-subj="showOrganicResults"]').simulate('click');
    const resultsWrapper = wrapper.find('[data-test-subj="proposedOrganicResults"]').find(Result);
    expect(resultsWrapper.length).toBe(1);
    expect(resultsWrapper.find(Result).at(0).prop('result')).toEqual({
      id: { raw: '3', snippet: null },
      foo: { raw: 'bar', snippet: null },
      _meta: { id: '3' },
    });
    expect(resultsWrapper.find(Result).at(0).prop('isMetaEngine')).toEqual(true);
    expect(resultsWrapper.find(Result).at(0).prop('schemaForTypeHighlights')).toEqual(
      values.engine.schema
    );
  });

  it('displays current organic results', () => {
    const wrapper = shallow(<CurationSuggestion />);
    wrapper.find('[data-test-subj="showOrganicResults"]').simulate('click');
    const resultWrapper = wrapper.find('[data-test-subj="currentOrganicResults"]').find(Result);
    expect(resultWrapper.length).toBe(2);
    expect(resultWrapper.find(Result).at(0).prop('result')).toEqual({
      id: { raw: '5', snippet: null },
      foo: { raw: 'bar', snippet: null },
      _meta: { id: '5' },
    });
    expect(resultWrapper.find(Result).at(0).prop('isMetaEngine')).toEqual(true);
    expect(resultWrapper.find(Result).at(0).prop('schemaForTypeHighlights')).toEqual(
      values.engine.schema
    );
  });

  it('shows an empty prompt when there are no organic results', () => {
    setMockValues({
      ...values,
      suggestion: {
        ...values.suggestion,
        organic: [],
        curation: {
          ...values.suggestion.curation,
          organic: [],
        },
      },
    });
    const wrapper = shallow(<CurationSuggestion />);
    wrapper.find('[data-test-subj="showOrganicResults"]').simulate('click');
    expect(wrapper.find('[data-test-subj="currentOrganicResults"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-subj="proposedOrganicResults"]').exists()).toBe(false);
    expect(wrapper.find(EuiEmptyPrompt).exists()).toBe(true);
  });

  it('renders even if no data is set yet', () => {
    setMockValues({
      suggestion: null,
    });
    const wrapper = shallow(<CurationSuggestion />);
    expect(wrapper.find(AppSearchPageTemplate).exists()).toBe(true);
  });
});
