/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { SearchExperiencesGuide } from './components/search_experiences_guide';

import { SearchExperiences } from '.';

describe('SearchExperiences', () => {
  it('renders the Search Experiences guide', () => {
    setMockValues({
      errorConnectingMessage: '',
      config: { host: 'localhost' },
    });
    const wrapper = shallow(<SearchExperiences />);

    expect(wrapper.find(SearchExperiencesGuide)).toHaveLength(1);
  });
});
