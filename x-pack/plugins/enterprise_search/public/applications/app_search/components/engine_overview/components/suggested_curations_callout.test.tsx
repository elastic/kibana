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
  // EngineLogic
  engine: {
    search_relevance_suggestions: {
      curation: {
        pending: 1,
      },
    },
  },
  // LicensingLogic
  hasPlatinumLicense: true,
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
    setMockValues({ ...MOCK_VALUES, engine: {} });

    const wrapper = shallow(<SuggestedCurationsCallout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('is empty when no pending curations', () => {
    const values = set('engine.search_relevance_suggestions.curation.pending', 0, MOCK_VALUES);
    setMockValues(values);

    const wrapper = shallow(<SuggestedCurationsCallout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('is empty when the user has no platinum license', () => {
    // This would happen if the user *had* suggestions and then downgraded from platinum to gold or something
    const values = set('hasPlatinumLicense', false, MOCK_VALUES);
    setMockValues(values);

    const wrapper = shallow(<SuggestedCurationsCallout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
