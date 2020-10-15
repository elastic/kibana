/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../mock/match_media';
import { TestProviders } from '../../mock';
import { Title } from './title';
import { useMountAppended } from '../../utils/use_mount_appended';

describe('Title', () => {
  const mount = useMountAppended();

  test('it renders', () => {
    const wrapper = shallow(
      <Title
        badgeOptions={{ beta: true, text: 'Beta', tooltip: 'Test tooltip' }}
        title="Test title"
      />
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the title', () => {
    const wrapper = mount(
      <TestProviders>
        <Title title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-title"]').first().exists()).toBe(true);
  });

  test('it renders as a draggable when arguments provided', () => {
    const wrapper = mount(
      <TestProviders>
        <Title draggableArguments={{ field: 'neat', value: 'cool' }} title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-draggable"]').first().exists()).toBe(true);
  });

  test('it DOES NOT render as a draggable when arguments not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <Title title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-draggable"]').first().exists()).toBe(false);
  });
});
