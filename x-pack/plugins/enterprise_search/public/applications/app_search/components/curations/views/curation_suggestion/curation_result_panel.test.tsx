/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { Result } from '../../../result';

import { CurationResultPanel } from './curation_result_panel';

describe('CurationResultPanel', () => {
  const results = [
    {
      id: { raw: 'foo' },
      _meta: { engine: 'some-engine', id: 'foo' },
    },
    {
      id: { raw: 'bar' },
      _meta: { engine: 'some-engine', id: 'bar' },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders results', () => {
    const wrapper = shallow(<CurationResultPanel variant="current" results={results} />);
    expect(wrapper.find('[data-test-subj="suggestedText"]').exists()).toBe(false);
    expect(wrapper.find(Result).length).toBe(2);
  });

  it('renders a no results message when there are no results', () => {
    const wrapper = shallow(<CurationResultPanel variant="current" results={[]} />);
    expect(wrapper.find('[data-test-subj="noResults"]').exists()).toBe(true);
    expect(wrapper.find(Result).length).toBe(0);
  });

  it('shows text about automation when variant is "suggested"', () => {
    const wrapper = shallow(<CurationResultPanel variant="suggested" results={results} />);
    expect(wrapper.find('[data-test-subj="suggestedText"]').exists()).toBe(true);
  });

  it('renders the right class name for the provided variant', () => {
    const wrapper = shallow(<CurationResultPanel variant="promoted" results={results} />);
    expect(wrapper.find('.curationResultPanel--promoted').exists()).toBe(true);
  });
});
