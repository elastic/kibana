/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../common/mock';

import { ArrowBody, ArrowHead } from '.';

describe('arrows', () => {
  describe('ArrowBody', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = mount(
        <TestProviders>
          <ArrowBody height={3} />
        </TestProviders>
      );
      expect(wrapper.find('ArrowBody')).toMatchSnapshot();
    });
  });

  describe('ArrowHead', () => {
    test('it renders an arrow head icon', () => {
      const wrapper = mount(
        <TestProviders>
          <ArrowHead direction={'arrowLeft'} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="arrow-icon"]').first().exists()).toBe(true);
    });
  });
});
