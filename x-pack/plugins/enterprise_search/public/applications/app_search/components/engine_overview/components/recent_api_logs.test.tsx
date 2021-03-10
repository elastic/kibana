/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { RecentApiLogs } from './recent_api_logs';

describe('RecentApiLogs', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    jest.clearAllMocks();
    wrapper = shallow(<RecentApiLogs />);
  });

  it('renders the recent API logs table', () => {
    expect(wrapper.prop('title')).toEqual(<h2>Recent API events</h2>);
    // TODO: expect(wrapper.find(ApiLogsTable)).toHaveLength(1)
  });
});
