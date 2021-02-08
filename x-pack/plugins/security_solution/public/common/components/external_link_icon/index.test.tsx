/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../mock';

import { ExternalLinkIcon } from '.';

describe('Duration', () => {
  test('it renders expected icon type when the leftMargin prop is not specified', () => {
    const wrapper = mount(
      <TestProviders>
        <ExternalLinkIcon />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="external-link-icon"]').first().props().type).toEqual(
      'popout'
    );
  });

  test('it renders expected icon type when the leftMargin prop is true', () => {
    const wrapper = mount(
      <TestProviders>
        <ExternalLinkIcon leftMargin={true} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="external-link-icon"]').first().props().type).toEqual(
      'popout'
    );
  });

  test('it applies a margin-left style when the leftMargin prop is true', () => {
    const wrapper = mount(
      <TestProviders>
        <ExternalLinkIcon leftMargin={true} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="external-link-icon"]').first()).toHaveStyleRule(
      'margin-left',
      '5px'
    );
  });

  test('it does NOT apply a margin-left style when the leftMargin prop is false', () => {
    const wrapper = mount(
      <TestProviders>
        <ExternalLinkIcon leftMargin={false} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="external-link-icon"]').first()).not.toHaveStyleRule(
      'margin-left'
    );
  });

  test('it renders expected icon type when the leftMargin prop is false', () => {
    const wrapper = mount(
      <TestProviders>
        <ExternalLinkIcon leftMargin={true} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="external-link-icon"]').first().props().type).toEqual(
      'popout'
    );
  });
});
