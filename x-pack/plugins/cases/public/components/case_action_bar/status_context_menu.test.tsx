/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CaseStatuses } from '../../../common/api';
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

  it('it renders when disabled', async () => {
    const wrapper = mount(
      <StatusContextMenu
        disabled={true}
        currentStatus={CaseStatuses.open}
        onStatusChanged={onStatusChanged}
      />
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

  it('it does not call onStatusChanged if selection is same as current status', async () => {
    const wrapper = mount(
      <StatusContextMenu currentStatus={CaseStatuses.open} onStatusChanged={onStatusChanged} />
    );

    wrapper.find(`[data-test-subj="case-view-status-dropdown"] button`).simulate('click');
    wrapper.find(`[data-test-subj="case-view-status-dropdown-open"] button`).simulate('click');

    expect(onStatusChanged).not.toHaveBeenCalled();
  });
});
