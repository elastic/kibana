/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';
import { fullContentSources } from '../../../../__mocks__/content_sources.mock';
import { blockedWindow } from './__mocks__/syncronization.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton, EuiDatePickerRange, EuiSelect, EuiSuperSelect } from '@elastic/eui';

import { BlockedWindowItem } from './blocked_window_item';

describe('BlockedWindowItem', () => {
  const removeBlockedWindow = jest.fn();
  const mockActions = {
    removeBlockedWindow,
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
    wrapper.find(EuiButton).simulate('click');

    expect(removeBlockedWindow).toHaveBeenCalledWith(0);
  });
});
