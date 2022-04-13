/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import {
  AutomatedCurationsHistoryPanel,
  IgnoredQueriesPanel,
  RejectedCurationsHistoryPanel,
} from './components';
import { CurationsHistory } from './curations_history';

describe('CurationsHistory', () => {
  it('renders', () => {
    const wrapper = shallow(<CurationsHistory />);

    expect(wrapper.find(AutomatedCurationsHistoryPanel)).toHaveLength(1);
    expect(wrapper.find(RejectedCurationsHistoryPanel)).toHaveLength(1);
    expect(wrapper.find(IgnoredQueriesPanel)).toHaveLength(1);
  });
});
