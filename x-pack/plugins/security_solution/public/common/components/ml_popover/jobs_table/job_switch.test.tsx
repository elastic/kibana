/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import React from 'react';

import { JobSwitchComponent } from './job_switch';
import { cloneDeep } from 'lodash/fp';
import { mockSiemJobs } from '../__mocks__/api';
import { SiemJob } from '../types';

describe('JobSwitch', () => {
  let siemJobs: SiemJob[];
  let onJobStateChangeMock = jest.fn();
  beforeEach(() => {
    siemJobs = cloneDeep(mockSiemJobs);
    onJobStateChangeMock = jest.fn();
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <JobSwitchComponent
        job={siemJobs[0]}
        isSiemJobsLoading={false}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('should call onJobStateChange when the switch is clicked to be true/open', () => {
    const wrapper = mount(
      <JobSwitchComponent
        job={siemJobs[0]}
        isSiemJobsLoading={false}
        onJobStateChange={onJobStateChangeMock}
      />
    );

    wrapper
      .find('button[data-test-subj="job-switch"]')
      .first()
      .simulate('click', {
        target: { checked: true },
      });

    expect(onJobStateChangeMock.mock.calls[0][0].id).toEqual(
      'linux_anomalous_network_activity_ecs'
    );
    expect(onJobStateChangeMock.mock.calls[0][1]).toEqual(1571022859393);
    expect(onJobStateChangeMock.mock.calls[0][2]).toEqual(true);
  });

  test('should have a switch when it is not in the loading state', () => {
    const wrapper = mount(
      <JobSwitchComponent
        isSiemJobsLoading={false}
        job={siemJobs[0]}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(true);
  });

  test('should not have a switch when it is in the loading state', () => {
    const wrapper = mount(
      <JobSwitchComponent
        isSiemJobsLoading={true}
        job={siemJobs[0]}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(false);
  });
});
