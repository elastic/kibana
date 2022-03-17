/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiDarkVars } from '@kbn/ui-theme';
import { mount, shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../mock';
import { HeaderSection } from './index';

describe('HeaderSection', () => {
  test('it renders', () => {
    const wrapper = shallow(<HeaderSection title="Test title" />);

    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the title', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-title"]').first().exists()).toBe(true);
  });

  test('it renders the subtitle when provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection subtitle="Test subtitle" title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-subtitle"]').first().exists()).toBe(true);
  });

  test('renders the subtitle when not provided (to prevent layout thrash)', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-subtitle"]').first().exists()).toBe(true);
  });

  test('it renders supplements when children provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-supplements"]').first().exists()).toBe(
      true
    );
  });

  test('it DOES NOT render supplements when children not provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="header-section-supplements"]').first().exists()).toBe(
      false
    );
  });

  test('it applies border styles when border is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection border title="Test title" />
      </TestProviders>
    );
    const siemHeaderSection = wrapper.find('.siemHeaderSection').first();

    expect(siemHeaderSection).toHaveStyleRule('border-bottom', euiDarkVars.euiBorderThin);
    expect(siemHeaderSection).toHaveStyleRule('padding-bottom', euiDarkVars.paddingSizes.l);
  });

  test('it DOES NOT apply border styles when border is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title" />
      </TestProviders>
    );
    const siemHeaderSection = wrapper.find('.siemHeaderSection').first();

    expect(siemHeaderSection).not.toHaveStyleRule('border-bottom', euiDarkVars.euiBorderThin);
    expect(siemHeaderSection).not.toHaveStyleRule('padding-bottom', euiDarkVars.paddingSizes.l);
  });

  test('it splits the title and supplement areas evenly when split is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection split title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper
        .find('.euiFlexItem--flexGrowZero[data-test-subj="header-section-supplements"]')
        .first()
        .exists()
    ).toBe(false);
  });

  test('it DOES NOT split the title and supplement areas evenly when split is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(
      wrapper
        .find('.euiFlexItem--flexGrowZero[data-test-subj="header-section-supplements"]')
        .first()
        .exists()
    ).toBe(true);
  });

  test('it renders an inspect button when an `id` is provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toBe(true);
  });

  test('it renders an inspect button when an `id` is provided and `showInspectButton` is true', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" title="Test title" showInspectButton={true}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toBe(true);
  });

  test('it does NOT render an inspect button when `showInspectButton` is false', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection id="an id" title="Test title" showInspectButton={false}>
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toBe(false);
  });

  test('it does NOT render an inspect button when an `id` is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <HeaderSection title="Test title">
          <p>{'Test children'}</p>
        </HeaderSection>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toBe(false);
  });
});
