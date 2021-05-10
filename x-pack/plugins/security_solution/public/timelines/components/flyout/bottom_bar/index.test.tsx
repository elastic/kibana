/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { FlyoutBottomBar } from '.';

describe('FlyoutBottomBar', () => {
  test('it renders the expected bottom bar', () => {
    const wrapper = mount(
      <TestProviders>
        <FlyoutBottomBar
          timelineId="test"
          showDataproviders={true}
          activeTab={TimelineTabs.query}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="flyoutBottomBar"]').exists()).toBeTruthy();
  });

  test('it renders the data providers drop target area', () => {
    const wrapper = mount(
      <TestProviders>
        <FlyoutBottomBar
          timelineId="test"
          showDataproviders={true}
          activeTab={TimelineTabs.query}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toBe(true);
  });

  test('it renders the flyout header panel', () => {
    const wrapper = mount(
      <TestProviders>
        <FlyoutBottomBar
          timelineId="test"
          showDataproviders={true}
          activeTab={TimelineTabs.query}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="timeline-flyout-header-panel"]').exists()).toBe(true);
  });

  test('it hides the data providers drop target area', () => {
    const wrapper = mount(
      <TestProviders>
        <FlyoutBottomBar
          timelineId="test"
          showDataproviders={false}
          activeTab={TimelineTabs.query}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toBe(false);
  });

  test('it hides the flyout header panel', () => {
    const wrapper = mount(
      <TestProviders>
        <FlyoutBottomBar
          timelineId="test"
          showDataproviders={false}
          activeTab={TimelineTabs.query}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="timeline-flyout-header-panel"]').exists()).toBe(false);
  });

  test('it renders the data providers drop target area when showDataproviders=false and tab is not query', () => {
    const wrapper = mount(
      <TestProviders>
        <FlyoutBottomBar
          timelineId="test"
          showDataproviders={false}
          activeTab={TimelineTabs.notes}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toBe(true);
  });
});
