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

import { SuggestionsCallout } from '../../curations/components/suggestions_callout';

import { SuggestedCurationsCallout } from './suggested_curations_callout';

const MOCK_VALUES = {
  engine: {
    adaptive_relevance_suggestions: {
      curation: {
        pending: 1,
      },
    },
    adaptive_relevance_suggestions_active: true,
  },
};

describe('SuggestedCurationsCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
  });

  it('renders', () => {
    const wrapper = shallow(<SuggestedCurationsCallout />);

    expect(wrapper.is(SuggestionsCallout));
  });

  it('is empty when the suggestions are undefined', () => {
    setMockValues({
      ...MOCK_VALUES,
      engine: {
        adaptive_relevance_suggestions_active: true,
      },
    });

    const wrapper = shallow(<SuggestedCurationsCallout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('is empty when suggestions are not active', () => {
    const values = set('engine.adaptive_relevance_suggestions_active', false, MOCK_VALUES);
    setMockValues(values);

    const wrapper = shallow(<SuggestedCurationsCallout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('is empty when no pending curations', () => {
    const values = set('engine.adaptive_relevance_suggestions.curation.pending', 0, MOCK_VALUES);
    setMockValues(values);

    const wrapper = shallow(<SuggestedCurationsCallout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
