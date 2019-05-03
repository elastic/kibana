/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { DataFrameJobListRow } from './common';
import { ExpandedRow } from './expanded_row';

import dataFrameJobListRow from './__mocks__/data_frame_job_list_row.json';

describe('Data Frame: Job List <ExpandedRow />', () => {
  test('Minimal initialization', () => {
    const item: DataFrameJobListRow = dataFrameJobListRow;

    const wrapper = shallow(<ExpandedRow item={item} />);

    expect(wrapper).toMatchSnapshot();
  });
});
