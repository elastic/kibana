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
import { AnomalyScoreComponent } from './anomaly_score';
import { mockAnomalies } from '../mock';
import { TestProviders } from '../../../mock/test_providers';
import { useMountAppended } from '../../../utils/use_mount_appended';
import type { Anomalies } from '../types';
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
      <AnomalyScoreComponent
        startDate={startDate}
        endDate={endDate}
        score={anomalies.anomalies[0]}
        interval="day"
        narrowDateRange={narrowDateRange}
        jobName={'job-1'}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('should not show a popover on initial render', () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoreComponent
          startDate={startDate}
          endDate={endDate}
          score={anomalies.anomalies[0]}
          interval="day"
          narrowDateRange={narrowDateRange}
          jobName={'job-1'}
        />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="anomaly-description-list"]').exists()).toEqual(false);
  });

  test('show a popover on a mouse click', async () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoreComponent
          startDate={startDate}
          endDate={endDate}
          score={anomalies.anomalies[0]}
          interval="day"
          narrowDateRange={narrowDateRange}
          jobName={'job-1'}
        />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="anomaly-score-popover"]').first().simulate('click');
    await waitFor(() => wrapper.update());
    expect(wrapper.find('[data-test-subj="anomaly-description-list"]').exists()).toEqual(true);
  });
});
