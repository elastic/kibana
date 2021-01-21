/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CaseStatuses } from '../../../../../case/common/api';
import { StatusContextMenu } from './status_context_menu';

describe('SyncAlertsSwitch', () => {
  const onStatusChanged = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('it renders', async () => {
    const wrapper = mount(
      <StatusContextMenu currentStatus={CaseStatuses.open} onStatusChanged={onStatusChanged} />
    );

    expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).exists()).toBeTruthy();
  });

  it('it renders the current status correctly', async () => {
    const wrapper = mount(
      <StatusContextMenu currentStatus={CaseStatuses.closed} onStatusChanged={onStatusChanged} />
    );

    expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).first().text()).toBe(
      'Closed'
    );
  });

  it('it changes the status', async () => {
    const wrapper = mount(
      <StatusContextMenu currentStatus={CaseStatuses.open} onStatusChanged={onStatusChanged} />
    );

    wrapper.find(`[data-test-subj="case-view-status-dropdown"] button`).simulate('click');
    wrapper
      .find(`[data-test-subj="case-view-status-dropdown-in-progress"] button`)
      .simulate('click');

    expect(onStatusChanged).toHaveBeenCalledWith('in-progress');
  });
});
