/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import dataFrameJobListRow from './__mocks__/data_frame_job_list_row.json';

import { JobJsonPane } from './job_json_pane';

describe('Data Frame: Job List Expanded Row <JobJsonPane />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(<JobJsonPane json={dataFrameJobListRow.config} />);

    expect(wrapper).toMatchSnapshot();
  });
});
