/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow, mount } from 'enzyme';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { JobsTableComponent } from './jobs_table';
import { mockSecurityJobs } from '../api.mock';
import { cloneDeep } from 'lodash/fp';
import type { SecurityJob } from '../types';

jest.mock('../../../lib/kibana');

export async function getRenderedHref(Component: React.FC, selector: string) {
  const el = render(<Component />);

  await waitFor(() => el.container.querySelector(selector));

  const a = el.container.querySelector(selector);
  return a?.getAttribute('href') ?? '';
}

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

  test('should render the hyperlink which points specifically to the job id', async () => {
    const href = await getRenderedHref(
      () => (
        <JobsTableComponent
          isLoading={true}
          jobs={securityJobs}
          onJobStateChange={onJobStateChangeMock}
        />
      ),
      '[data-test-subj="jobs-table-link"]'
    );
    await waitFor(() =>
      expect(href).toEqual(
        "/app/ml/jobs?_a=(jobs:(queryText:'id:linux_anomalous_network_activity_ecs'))"
      )
    );
  });

  test('should display the job friendly name', async () => {
    const wrapper = mount(
      <JobsTableComponent
        isLoading={true}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
      />
    );

    await waitFor(() =>
      expect(wrapper.find('[data-test-subj="jobs-table-link"]').first().text()).toContain(
        'Unusual Network Activity'
      )
    );
  });

  test('should render the hyperlink with URI encodings which points specifically to the job id', async () => {
    securityJobs[0].id = 'job id with spaces';
    const href = await getRenderedHref(
      () => (
        <JobsTableComponent
          isLoading={true}
          jobs={securityJobs}
          onJobStateChange={onJobStateChangeMock}
        />
      ),
      '[data-test-subj="jobs-table-link"]'
    );
    await waitFor(() =>
      expect(href).toEqual("/app/ml/jobs?_a=(jobs:(queryText:'id:job%20id%20with%20spaces'))")
    );
  });

  test('should call onJobStateChange when the switch is clicked to be true/open', async () => {
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
    await waitFor(() => {
      expect(onJobStateChangeMock.mock.calls[0]).toEqual([securityJobs[0], 1571022859393, true]);
    });
  });

  test('should have a switch when it is not in the loading state', async () => {
    const wrapper = mount(
      <JobsTableComponent
        isLoading={false}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(true);
    });
  });

  test('should not have a switch when it is in the loading state', async () => {
    const wrapper = mount(
      <JobsTableComponent
        isLoading={true}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
      />
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(false);
    });
  });
});
