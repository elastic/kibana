/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import '../../../mock/match_media';
import { AnomalyScoresComponent, createJobKey } from './anomaly_scores';
import { mockAnomalies } from '../mock';
import { TestProviders } from '../../../mock/test_providers';
import { getEmptyValue } from '../../empty_value';
import type { Anomalies } from '../types';
import { useMountAppended } from '../../../utils/use_mount_appended';
import { waitFor } from '@testing-library/react';

jest.mock('../../../lib/kibana');

const startDate: string = '2020-07-07T08:20:18.966Z';
const endDate: string = '3000-01-01T00:00:00.000Z';
const narrowDateRange = jest.fn();
describe('anomaly_scores', () => {
  let anomalies: Anomalies = cloneDeep(mockAnomalies);
  const mount = useMountAppended();

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <AnomalyScoresComponent
        anomalies={anomalies}
        startDate={startDate}
        endDate={endDate}
        isLoading={false}
        narrowDateRange={narrowDateRange}
        jobNameById={{}}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('renders spinner when isLoading is true is passed', () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoresComponent
          anomalies={anomalies}
          startDate={startDate}
          endDate={endDate}
          isLoading={true}
          narrowDateRange={narrowDateRange}
          jobNameById={{}}
        />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="anomaly-score-spinner"]').exists()).toEqual(true);
  });

  test('does NOT render spinner when isLoading is false is passed', () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoresComponent
          anomalies={anomalies}
          startDate={startDate}
          endDate={endDate}
          isLoading={false}
          narrowDateRange={narrowDateRange}
          jobNameById={{}}
        />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="anomaly-score-spinner"]').exists()).toEqual(false);
  });

  test('renders an empty value if anomalies is null', () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoresComponent
          anomalies={null}
          startDate={startDate}
          endDate={endDate}
          isLoading={false}
          narrowDateRange={narrowDateRange}
          jobNameById={{}}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('renders an empty value if anomalies array is empty', () => {
    anomalies.anomalies = [];
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoresComponent
          anomalies={anomalies}
          startDate={startDate}
          endDate={endDate}
          isLoading={false}
          narrowDateRange={narrowDateRange}
          jobNameById={{}}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('can create a job key', () => {
    const job = createJobKey(anomalies.anomalies[0]);
    expect(job).toEqual('job-1-16.193669439507826-process.name-du');
  });

  test('should not show a popover on initial render', () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoresComponent
          anomalies={anomalies}
          startDate={startDate}
          endDate={endDate}
          isLoading={false}
          narrowDateRange={narrowDateRange}
          jobNameById={{}}
        />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="anomaly-description-list"]').exists()).toEqual(false);
  });

  test('showing a popover on a mouse click', async () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoresComponent
          anomalies={anomalies}
          startDate={startDate}
          endDate={endDate}
          isLoading={false}
          narrowDateRange={narrowDateRange}
          jobNameById={{}}
        />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="anomaly-score-popover"]').first().simulate('click');
    await waitFor(() => wrapper.update());
    expect(wrapper.find('[data-test-subj="anomaly-description-list"]').exists()).toEqual(true);
  });
});
