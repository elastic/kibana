/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';
import { AnomalyScoreComponent } from './anomaly_score';
import { mockAnomalies } from '../mock';
import { TestProviders } from '../../../mock/test_providers';
import { useMountAppended } from '../../../utils/use_mount_appended';
import { Anomalies } from '../types';

const endDate: number = new Date('3000-01-01T00:00:00.000Z').valueOf();
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
        jobKey="job-key-1"
        startDate={0}
        endDate={endDate}
        score={anomalies.anomalies[0]}
        interval="day"
        narrowDateRange={narrowDateRange}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('should not show a popover on initial render', () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoreComponent
          jobKey="job-key-1"
          startDate={0}
          endDate={endDate}
          score={anomalies.anomalies[0]}
          interval="day"
          narrowDateRange={narrowDateRange}
        />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="anomaly-description-list"]').exists()).toEqual(false);
  });

  test('show a popover on a mouse click', () => {
    const wrapper = mount(
      <TestProviders>
        <AnomalyScoreComponent
          jobKey="job-key-1"
          startDate={0}
          endDate={endDate}
          score={anomalies.anomalies[0]}
          interval="day"
          narrowDateRange={narrowDateRange}
        />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="anomaly-score-popover"]').first().simulate('click');
    wrapper.update();
    expect(wrapper.find('[data-test-subj="anomaly-description-list"]').exists()).toEqual(true);
  });
});
