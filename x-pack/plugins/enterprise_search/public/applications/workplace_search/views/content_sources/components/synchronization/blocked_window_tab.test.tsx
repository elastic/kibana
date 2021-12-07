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

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';

import { BlockedWindowItem } from './blocked_window_item';
import { BlockedWindows } from './blocked_window_tab';

describe('BlockedWindows', () => {
  const addBlockedWindow = jest.fn();
  const mockActions = {
    addBlockedWindow,
  };
  const contentSource = { ...fullContentSources[0] };
  contentSource.indexing.schedule.blockedWindows = [blockedWindow] as any;
  const mockValues = {
    contentSource,
    schedule: contentSource.indexing.schedule,
  };

  beforeEach(() => {
    setMockActions(mockActions);
    setMockValues(mockValues);
  });

  it('renders blocked windows', () => {
    const wrapper = shallow(<BlockedWindows />);

    expect(wrapper.find(BlockedWindowItem)).toHaveLength(1);
  });

  it('renders empty state', () => {
    setMockValues({ schedule: { blockedWindows: [] } });
    const wrapper = shallow(<BlockedWindows />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });

  it('handles button click', () => {
    const wrapper = shallow(<BlockedWindows />);
    wrapper.find(EuiButton).simulate('click');

    expect(addBlockedWindow).toHaveBeenCalled();
  });
});
