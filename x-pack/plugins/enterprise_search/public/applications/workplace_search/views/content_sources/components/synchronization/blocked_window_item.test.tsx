/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { blockedWindow } from './__mocks__/syncronization.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiDatePickerRange, EuiSelect, EuiSuperSelect } from '@elastic/eui';

import { BlockedWindowItem } from './blocked_window_item';

describe('BlockedWindowItem', () => {
  const props = { blockedWindow };
  it('renders', () => {
    const wrapper = shallow(<BlockedWindowItem {...props} />);

    expect(wrapper.find(EuiSelect)).toHaveLength(1);
    expect(wrapper.find(EuiSuperSelect)).toHaveLength(1);
    expect(wrapper.find(EuiDatePickerRange)).toHaveLength(1);
  });
});
