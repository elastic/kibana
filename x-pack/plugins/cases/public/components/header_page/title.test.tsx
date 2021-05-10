/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../common/mock/match_media';
import { TestProviders } from '../../common/mock';
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
});
