/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../common/mock';
import { EmbeddableHeader } from './embeddable_header';

describe('EmbeddableHeader', () => {
  test('it renders', () => {
    const wrapper = shallow(<EmbeddableHeader title="Test title" />);

    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the title', () => {
    const wrapper = mount(
      <TestProviders>
        <EmbeddableHeader title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-embeddable-title"]').first().exists()).toBe(true);
  });

  test('it renders supplements when children provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EmbeddableHeader title="Test title">
          <p>{'Test children'}</p>
        </EmbeddableHeader>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-embeddable-supplements"]').first().exists()).toBe(
      true
    );
  });

  test('it DOES NOT render supplements when children not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <EmbeddableHeader title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-embeddable-supplements"]').first().exists()).toBe(
      false
    );
  });
});
