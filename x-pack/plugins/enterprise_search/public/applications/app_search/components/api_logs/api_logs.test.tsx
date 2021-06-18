/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import '../../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPageHeader } from '@elastic/eui';

import { Loading } from '../../../shared/loading';
import { rerender } from '../../../test_helpers';
import { LogRetentionCallout, LogRetentionTooltip } from '../log_retention';

import { ApiLogsTable, NewApiEventsPrompt } from './components';

import { ApiLogs } from './';

describe('ApiLogs', () => {
  const values = {
    dataLoading: false,
    apiLogs: [],
    meta: { page: { current: 1 } },
  };
  const actions = {
    fetchApiLogs: jest.fn(),
    pollForApiLogs: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<ApiLogs />);
    expect(wrapper.find(EuiPageHeader).prop('pageTitle')).toEqual('API Logs');
    expect(wrapper.find(ApiLogsTable)).toHaveLength(1);
    expect(wrapper.find(NewApiEventsPrompt)).toHaveLength(1);

    expect(wrapper.find(LogRetentionCallout).prop('type')).toEqual('api');
    expect(wrapper.find(LogRetentionTooltip).prop('type')).toEqual('api');
  });

  it('renders a loading screen', () => {
    setMockValues({ ...values, dataLoading: true, apiLogs: [] });
    const wrapper = shallow(<ApiLogs />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  describe('effects', () => {
    it('calls a manual fetchApiLogs on page load and pagination', () => {
      const wrapper = shallow(<ApiLogs />);
      expect(actions.fetchApiLogs).toHaveBeenCalledTimes(1);

      setMockValues({ ...values, meta: { page: { current: 2 } } });
      rerender(wrapper);

      expect(actions.fetchApiLogs).toHaveBeenCalledTimes(2);
    });

    it('starts pollForApiLogs on page load', () => {
      shallow(<ApiLogs />);
      expect(actions.pollForApiLogs).toHaveBeenCalledTimes(1);
    });
  });
});
