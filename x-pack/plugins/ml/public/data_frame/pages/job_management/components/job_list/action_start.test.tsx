/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { DataFrameJobListRow } from './common';
import { StartAction } from './action_start';

import dataFrameJobListRow from './__mocks__/data_frame_job_list_row.json';

describe('Data Frame: Job List Actions <StartAction />', () => {
  test('Minimal initialization', () => {
    const item: DataFrameJobListRow = dataFrameJobListRow;
    const props = {
      disabled: false,
      item,
      startJob(d: DataFrameJobListRow) {},
    };

    const wrapper = shallow(<StartAction {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
