/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { useInstalledSecurityJobs } from '../../../../common/components/ml/hooks/use_installed_security_jobs';
import { MlJobCompatibilityCallout } from '.';

jest.mock('../../../../common/components/ml/hooks/use_installed_security_jobs');

describe('MlJobCompatibilityCallout', () => {
  it('renders when new affected jobs are installed', () => {
    (useInstalledSecurityJobs as jest.Mock).mockReturnValue({
      loading: false,
      jobs: [{ id: 'v2_linux_rare_metadata_process' }],
    });
    const wrapper = mount(
      <TestProviders>
        <MlJobCompatibilityCallout />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-ml-job-compatibility"]')).toEqual(true);
  });

  it('renders when old affected jobs are installed', () => {
    (useInstalledSecurityJobs as jest.Mock).mockReturnValue({
      loading: false,
      jobs: [{ id: 'linux_rare_metadata_process' }],
    });
    const wrapper = mount(
      <TestProviders>
        <MlJobCompatibilityCallout />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-ml-job-compatibility"]')).toEqual(true);
  });

  it('does not render if no affected jobs are installed', () => {
    (useInstalledSecurityJobs as jest.Mock).mockReturnValue({
      loading: false,
      jobs: [{ id: 'windows_rare_user_type10_remote_login' }],
    });
    const wrapper = mount(
      <TestProviders>
        <MlJobCompatibilityCallout />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-ml-job-compatibility"]')).toEqual(false);
  });

  it('does not render while jobs are loading', () => {
    (useInstalledSecurityJobs as jest.Mock).mockReturnValue({
      loading: true,
      jobs: [],
    });
    const wrapper = mount(
      <TestProviders>
        <MlJobCompatibilityCallout />
      </TestProviders>
    );
    expect(wrapper.exists('[data-test-subj="callout-ml-job-compatibility"]')).toEqual(false);
  });
});
