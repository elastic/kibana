/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import React from 'react';
import { JobsTableComponent } from './jobs_table';
import { mockSecurityJobs } from '../api.mock';
import { cloneDeep } from 'lodash/fp';
import { SecurityJob } from '../types';

jest.mock('../../../lib/kibana');

describe('JobsTableComponent', () => {
  let securityJobs: SecurityJob[];
  let onJobStateChangeMock = jest.fn();
  beforeEach(() => {
    securityJobs = cloneDeep(mockSecurityJobs);
    onJobStateChangeMock = jest.fn();
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <JobsTableComponent
        isLoading={true}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('should render the hyperlink which points specifically to the job id', () => {
    const wrapper = mount(
      <JobsTableComponent
        isLoading={true}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="jobs-table-link"]').first().props().href).toEqual(
      '/test/base/path/app/ml#/jobs?mlManagement=(jobId:linux_anomalous_network_activity_ecs)'
    );
  });

  test('should render the hyperlink with URI encodings which points specifically to the job id', () => {
    securityJobs[0].id = 'job id with spaces';
    const wrapper = mount(
      <JobsTableComponent
        isLoading={true}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="jobs-table-link"]').first().props().href).toEqual(
      '/test/base/path/app/ml#/jobs?mlManagement=(jobId:job%20id%20with%20spaces)'
    );
  });

  test('should call onJobStateChange when the switch is clicked to be true/open', () => {
    const wrapper = mount(
      <JobsTableComponent
        isLoading={false}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    wrapper
      .find('button[data-test-subj="job-switch"]')
      .first()
      .simulate('click', {
        target: { checked: true },
      });
    expect(onJobStateChangeMock.mock.calls[0]).toEqual([securityJobs[0], 1571022859393, true]);
  });

  test('should have a switch when it is not in the loading state', () => {
    const wrapper = mount(
      <JobsTableComponent
        isLoading={false}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(true);
  });

  test('should not have a switch when it is in the loading state', () => {
    const wrapper = mount(
      <JobsTableComponent
        isLoading={true}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(false);
  });
});
