/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MlJobUpgradeCallout } from './index';
import { TestProviders } from '../../../../common/mock';

describe('MlJobUpgradeCallout', () => {
  it('renders when v2 jobs are installed', () => {
    const wrapper = mount(
      <TestProviders>
        <MlJobUpgradeCallout />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-ml-job-upgrade"]')).toEqual(true);
  });

  it('does not render if no v2 jobs are installed', () => {
    const wrapper = mount(
      <TestProviders>
        <MlJobUpgradeCallout />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-ml-job-upgrade"]')).toEqual(false);
  });

  it('does not render while jobs are loading', () => {
    const wrapper = mount(
      <TestProviders>
        <MlJobUpgradeCallout />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-ml-job-upgrade"]')).toEqual(false);
  });
});
