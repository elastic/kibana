/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import '../../../__mocks__/engine_logic.mock';

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';
import { set } from 'lodash/fp';

import { SuggestionsCallout } from '../components/suggestions_callout';

import { SuggestedDocumentsCallout } from './suggested_documents_callout';

const MOCK_VALUES = {
  // CurationLogic
  curation: {
    suggestion: {
      status: 'pending',
      updated_at: '2021-01-01T00:30:00Z',
    },
    queries: ['some query'],
  },
  // EngineLogic
  engine: {
    adaptive_relevance_suggestions_active: true,
  },
};

describe('SuggestedDocumentsCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
  });

  it('renders', () => {
    const wrapper = shallow(<SuggestedDocumentsCallout />);

    expect(wrapper.is(SuggestionsCallout));
  });

  it('is empty when the suggestion is undefined', () => {
    setMockValues({ ...MOCK_VALUES, curation: {} });

    const wrapper = shallow(<SuggestedDocumentsCallout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('is empty when suggestions are not active', () => {
    const values = set('engine.adaptive_relevance_suggestions_active', false, MOCK_VALUES);
    setMockValues(values);

    const wrapper = shallow(<SuggestedDocumentsCallout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('is empty when curation status is not pending', () => {
    const values = set('curation.suggestion.status', 'applied', MOCK_VALUES);
    setMockValues(values);
    const wrapper = shallow(<SuggestedDocumentsCallout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
