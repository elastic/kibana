/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPageHeader } from '@elastic/eui';

import { LogRetentionCallout, LogRetentionTooltip } from '../log_retention';

import { ApiLogs } from './';

describe('ApiLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<ApiLogs engineBreadcrumb={['some engine']} />);

    expect(wrapper.find(EuiPageHeader).prop('pageTitle')).toEqual('API Logs');
    // TODO: Check for ApiLogsTable + NewApiEventsPrompt when those get added

    expect(wrapper.find(LogRetentionCallout).prop('type')).toEqual('api');
    expect(wrapper.find(LogRetentionTooltip).prop('type')).toEqual('api');
  });
});
