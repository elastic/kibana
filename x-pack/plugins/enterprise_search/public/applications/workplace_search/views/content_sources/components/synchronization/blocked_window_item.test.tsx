/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';
import { fullContentSources } from '../../../../__mocks__/content_sources.mock';
import { blockedWindow } from './__mocks__/synchronization.mock';

import React from 'react';

import { shallow } from 'enzyme';
import moment from 'moment';

import {
  EuiButtonIcon,
  EuiDatePicker,
  EuiDatePickerRange,
  EuiSelect,
  EuiSuperSelect,
} from '@elastic/eui';

import { BlockedWindowItem } from './blocked_window_item';

describe('BlockedWindowItem', () => {
  const removeBlockedWindow = jest.fn();
  const setBlockedTimeWindow = jest.fn();
  const mockActions = {
    removeBlockedWindow,
    setBlockedTimeWindow,
  };
  const mockValues = {
    contentSource: fullContentSources[0],
  };

  beforeEach(() => {
    setMockActions(mockActions);
    setMockValues(mockValues);
  });

  const props = { blockedWindow, index: 0 };

  it('renders', () => {
    const wrapper = shallow(<BlockedWindowItem {...props} />);

    expect(wrapper.find(EuiSelect)).toHaveLength(1);
    expect(wrapper.find(EuiSuperSelect)).toHaveLength(1);
    expect(wrapper.find(EuiDatePickerRange)).toHaveLength(1);
  });

  it('handles remove button click', () => {
    const wrapper = shallow(<BlockedWindowItem {...props} />);
    wrapper.find(EuiButtonIcon).simulate('click');

    expect(removeBlockedWindow).toHaveBeenCalledWith(0);
  });

  it('handles "jobType" select change', () => {
    const wrapper = shallow(<BlockedWindowItem {...props} />);
    wrapper.find(EuiSuperSelect).simulate('change', 'delete');

    expect(setBlockedTimeWindow).toHaveBeenCalledWith(0, 'jobType', 'delete');
  });

  it('handles "day" select change', () => {
    const wrapper = shallow(<BlockedWindowItem {...props} />);
    wrapper.find(EuiSelect).simulate('change', { target: { value: 'tuesday' } });

    expect(setBlockedTimeWindow).toHaveBeenCalledWith(0, 'day', 'tuesday');
  });

  it('handles "start" time change', () => {
    const wrapper = shallow(<BlockedWindowItem {...props} />);
    const dayRange = wrapper.find(EuiDatePickerRange).dive();
    dayRange
      .find(EuiDatePicker)
      .first()
      .simulate('change', moment().utc().set({ hour: 10, minute: 0, seconds: 0 }));

    expect(setBlockedTimeWindow).toHaveBeenCalledWith(0, 'start', '10:00:00Z');
  });

  it('handles "end" time change', () => {
    const wrapper = shallow(<BlockedWindowItem {...props} />);
    const dayRange = wrapper.find(EuiDatePickerRange).dive();
    dayRange
      .find(EuiDatePicker)
      .last()
      .simulate('change', moment().utc().set({ hour: 12, minute: 0, seconds: 0 }));

    expect(setBlockedTimeWindow).toHaveBeenCalledWith(0, 'end', '12:00:00Z');
  });
});
