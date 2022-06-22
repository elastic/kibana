/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, mount } from 'enzyme';

import { EuiIconTip } from '@elastic/eui';

import { LogRetentionOptions, LogRetentionMessage } from '..';

import { LogRetentionTooltip } from '.';

describe('LogRetentionTooltip', () => {
  const values = {
    logRetention: {},
    myRole: { canManageLogSettings: true },
  };
  const actions = { fetchLogRetention: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders an analytics tooltip', () => {
    const wrapper = shallow(<LogRetentionTooltip type={LogRetentionOptions.Analytics} />);
    const tooltipContent = wrapper.find(EuiIconTip).prop('content') as React.ReactElement;

    expect(tooltipContent.type).toEqual(LogRetentionMessage);
    expect(tooltipContent.props.type).toEqual('analytics');
  });

  it('renders an API tooltip', () => {
    const wrapper = shallow(<LogRetentionTooltip type={LogRetentionOptions.API} />);
    const tooltipContent = wrapper.find(EuiIconTip).prop('content') as React.ReactElement;

    expect(tooltipContent.type).toEqual(LogRetentionMessage);
    expect(tooltipContent.props.type).toEqual('api');
  });

  it('passes custom tooltip positions', () => {
    const wrapper = shallow(<LogRetentionTooltip type={LogRetentionOptions.API} />);
    expect(wrapper.find(EuiIconTip).prop('position')).toEqual('bottom');

    wrapper.setProps({ position: 'right' });
    expect(wrapper.find(EuiIconTip).prop('position')).toEqual('right');
  });

  it('does not render if log retention is not available', () => {
    setMockValues({ ...values, logRetention: null });
    const wrapper = mount(<LogRetentionTooltip type={LogRetentionOptions.API} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  describe('on mount', () => {
    it('fetches log retention data when not already loaded', () => {
      setMockValues({ ...values, logRetention: null });
      shallow(<LogRetentionTooltip type={LogRetentionOptions.Analytics} />);

      expect(actions.fetchLogRetention).toHaveBeenCalled();
    });

    it('does not fetch log retention data if it has already been loaded', () => {
      setMockValues({ ...values, logRetention: {} });
      shallow(<LogRetentionTooltip type={LogRetentionOptions.Analytics} />);

      expect(actions.fetchLogRetention).not.toHaveBeenCalled();
    });

    it('does not fetch log retention data if the user does not have access to log settings', () => {
      setMockValues({ ...values, logRetention: null, myRole: { canManageLogSettings: false } });
      shallow(<LogRetentionTooltip type={LogRetentionOptions.Analytics} />);

      expect(actions.fetchLogRetention).not.toHaveBeenCalled();
    });
  });
});
