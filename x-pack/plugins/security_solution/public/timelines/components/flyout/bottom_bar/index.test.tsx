/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { FlyoutBottomBar } from '.';

describe('FlyoutBottomBar', () => {
  test('it renders the expected bottom bar', () => {
    const wrapper = mount(
      <TestProviders>
        <FlyoutBottomBar timelineId="test" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="flyoutBottomBar"]').exists()).toBeTruthy();
  });

  test('it renders the data providers drop target area', () => {
    const wrapper = mount(
      <TestProviders>
        <FlyoutBottomBar timelineId="test" />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toBe(true);
  });
});
