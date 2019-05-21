/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { DataFrameJobListRow } from './common';
import { DeleteAction, getActions } from './actions';

import dataFrameJobListRow from './__mocks__/data_frame_job_list_row.json';

describe('Data Frame: Job List Actions <DeleteAction />', () => {
  test('Minimal initialization', () => {
    const item: DataFrameJobListRow = dataFrameJobListRow;
    const props = {
      disabled: false,
      item,
      deleteJob(d: DataFrameJobListRow) {},
    };

    const wrapper = shallow(<DeleteAction {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});

describe('Data Frame: Job List Actions', () => {
  test('getActions()', () => {
    const actions = getActions(() => {});

    expect(actions).toHaveLength(2);
    expect(actions[0].isPrimary).toBeTruthy();
    expect(typeof actions[0].render).toBe('function');
    expect(typeof actions[1].render).toBe('function');
  });
});
