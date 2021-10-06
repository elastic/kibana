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

import { AppSearchPageTemplate } from '../../../layout';

import { Result } from '../../../result';

import { CurationResultPanel } from './curation_result_panel';
import { CurationSuggestion } from './curation_suggestion';

describe('CurationSuggestion', () => {
  const values = {
    suggestion: {
      query: 'foo',
      updated_at: '2021-07-08T14:35:50Z',
      promoted: ['1', '2', '3'],
    },
    suggestedPromotedDocuments: [
      {
        id: {
          raw: '1',
        },
        _meta: {
          id: '1',
          engine: 'some-engine',
        },
      },
      {
        id: {
          raw: '2',
        },
        _meta: {
          id: '2',
          engine: 'some-engine',
        },
      },
      {
        id: {
          raw: '3',
        },
        _meta: {
          id: '3',
          engine: 'some-engine',
        },
      },
    ],
    curation: {
      promoted: [
        {
          id: '4',
          foo: 'foo',
        },
      ],
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
    // gets populated from 'curation' in state, and converted to results format (i.e, has raw properties, etc.)
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

  it('shows suggested promoted documents', () => {
    const wrapper = shallow(<CurationSuggestion />);
    const suggestedResultsPanel = wrapper.find(CurationResultPanel).at(1);
    expect(suggestedResultsPanel.prop('results')).toEqual(values.suggestedPromotedDocuments);
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
    expect(wrapper.find('[data-test-subj="proposedOrganicResults"]').find(Result).length).toBe(4);
    expect(wrapper.find(Result).at(0).prop('isMetaEngine')).toEqual(true);
    expect(wrapper.find(Result).at(0).prop('schemaForTypeHighlights')).toEqual(
      values.engine.schema
    );
  });

  it('displays current organic results', () => {
    const wrapper = shallow(<CurationSuggestion />);
    wrapper.find('[data-test-subj="showOrganicResults"]').simulate('click');
    expect(wrapper.find('[data-test-subj="currentOrganicResults"]').find(Result).length).toBe(4);
    expect(wrapper.find(Result).at(0).prop('isMetaEngine')).toEqual(true);
    expect(wrapper.find(Result).at(0).prop('schemaForTypeHighlights')).toEqual(
      values.engine.schema
    );
  });
});
