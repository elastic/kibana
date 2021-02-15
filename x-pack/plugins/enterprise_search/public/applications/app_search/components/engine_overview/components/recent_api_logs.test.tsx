/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButtonTo } from '../../../../shared/react_router_helpers';

import { RecentApiLogs } from './recent_api_logs';

describe('RecentApiLogs', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    jest.clearAllMocks();
    wrapper = shallow(<RecentApiLogs />);
  });

  it('renders the recent API logs table', () => {
    expect(wrapper.find('h2').text()).toEqual('Recent API events');
    expect(wrapper.find(EuiButtonTo).prop('to')).toEqual('/engines/some-engine/api-logs');
    // TODO: expect(wrapper.find(ApiLogsTable)).toHaveLength(1)
  });
});
