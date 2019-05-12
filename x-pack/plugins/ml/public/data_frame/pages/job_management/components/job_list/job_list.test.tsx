/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { DataFrameJobList } from './job_list';

describe('Data Frame: Job List <DataFrameJobList />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(<DataFrameJobList />);

    expect(wrapper).toMatchSnapshot();
  });
});
