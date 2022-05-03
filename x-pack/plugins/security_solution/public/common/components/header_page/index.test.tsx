/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiDarkVars } from '@kbn/ui-theme';
import { shallow } from 'enzyme';
import React from 'react';

import '../../mock/match_media';
import { TestProviders } from '../../mock';
import { HeaderPage } from '.';
import { useMountAppended } from '../../utils/use_mount_appended';
import { SecurityPageName } from '../../../app/types';

jest.mock('../../lib/kibana');
jest.mock('../link_to');

describe('HeaderPage', () => {
  const mount = useMountAppended();

  test('it renders', () => {
    const wrapper = shallow(
      <HeaderPage
        badgeOptions={{ beta: true, text: 'Beta', tooltip: 'Test tooltip' }}
        border
        subtitle="Test subtitle"
        subtitle2="Test subtitle 2"
        title="Test title"
      >
        <p>{'Test supplement'}</p>
      </HeaderPage>
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the back link when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage
          backOptions={{ path: '#', text: 'Test link', pageId: SecurityPageName.hosts }}
          title="Test title"
        />
      </TestProviders>
    );

    expect(wrapper.find('.securitySolutionHeaderPage__linkBack').first().exists()).toBe(true);
  });

  test('it DOES NOT render the back link when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('.securitySolutionHeaderPage__linkBack').first().exists()).toBe(false);
  });

  test('it renders the first subtitle when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage subtitle="Test subtitle" title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-subtitle"]').first().exists()).toBe(true);
  });

  test('it DOES NOT render the first subtitle when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-subtitle"]').first().exists()).toBe(false);
  });

  test('it renders the second subtitle when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage subtitle2="Test subtitle 2" title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-subtitle-2"]').first().exists()).toBe(true);
  });

  test('it DOES NOT render the second subtitle when not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-subtitle-2"]').first().exists()).toBe(
      false
    );
  });

  test('it renders supplements when children provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title">
          <p>{'Test supplement'}</p>
        </HeaderPage>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-supplements"]').first().exists()).toBe(true);
  });

  test('it DOES NOT render supplements when children not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-page-supplements"]').first().exists()).toBe(false);
  });

  test('it DOES NOT apply border styles when border is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderPage title="Test title" />
      </TestProviders>
    );
    const securitySolutionHeaderPage = wrapper.find('.securitySolutionHeaderPage').first();

    expect(securitySolutionHeaderPage).not.toHaveStyleRule(
      'border-bottom',
      euiDarkVars.euiBorderThin
    );
    expect(securitySolutionHeaderPage).not.toHaveStyleRule(
      'padding-bottom',
      euiDarkVars.paddingSizes.l
    );
  });
});
