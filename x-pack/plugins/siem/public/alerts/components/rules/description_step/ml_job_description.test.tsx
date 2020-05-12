/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { MlJobDescription, AuditIcon, JobStatusBadge } from './ml_job_description';
jest.mock('../../../../common/lib/kibana');

const job = {
  moduleId: 'moduleId',
  defaultIndexPattern: 'defaultIndexPattern',
  isCompatible: true,
  isInstalled: true,
  isElasticJob: true,
  datafeedId: 'datafeedId',
  datafeedIndices: [],
  datafeedState: 'datafeedState',
  description: 'description',
  groups: [],
  hasDatafeed: true,
  id: 'id',
  isSingleMetricViewerJob: false,
  jobState: 'jobState',
  memory_status: 'memory_status',
  processed_record_count: 0,
};

describe('MlJobDescription', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<MlJobDescription job={job} />);

    expect(wrapper.find('[data-test-subj="machineLearningJobId"]')).toHaveLength(1);
  });
});

describe('AuditIcon', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<AuditIcon message={undefined} />);

    expect(wrapper.find('EuiToolTip')).toHaveLength(0);
  });
});

describe('JobStatusBadge', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<JobStatusBadge job={job} />);

    expect(wrapper.find('EuiBadge')).toHaveLength(1);
  });
});
