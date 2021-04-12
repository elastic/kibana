/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { mockOpenedJob } from '../../../../common/components/ml_popover/api.mock';
import { MlJobDescription, AuditIcon, JobStatusBadge } from './ml_job_description';

jest.mock('../../../../common/lib/kibana');

describe('MlJobDescription', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<MlJobDescription jobId={'myJobId'} />);

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
    const wrapper = shallow(<JobStatusBadge job={mockOpenedJob} />);

    expect(wrapper.find('EuiBadge')).toHaveLength(1);
  });
});
