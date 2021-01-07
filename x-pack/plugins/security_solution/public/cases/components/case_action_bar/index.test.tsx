/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { basicCase } from '../../containers/mock';
import { CaseActionBar } from '.';
import { TestProviders } from '../../../common/mock';

describe('CaseActionBar', () => {
  const onRefresh = jest.fn();
  const onUpdateField = jest.fn();
  const defaultProps = {
    caseData: basicCase,
    isLoading: false,
    onRefresh,
    onUpdateField,
    currentExternalIncident: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('it renders', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="case-view-status"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="case-action-bar-status-date"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="sync-alerts-switch"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="case-refresh"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="case-view-actions"]`).exists()).toBeTruthy();
  });

  it('it should show correct status', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="case-view-status-dropdown"]`).first().text()).toBe(
      'Open'
    );
  });

  it('it should show the correct date', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="case-action-bar-status-date"]`).prop('value')).toBe(
      basicCase.createdAt
    );
  });

  it('it call onRefresh', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="case-refresh"]`).first().simulate('click');
    expect(onRefresh).toHaveBeenCalled();
  });

  it('it should call onUpdateField when changing status', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="case-view-status-dropdown"] button`).simulate('click');
    wrapper
      .find(`[data-test-subj="case-view-status-dropdown-in-progress"] button`)
      .simulate('click');

    expect(onUpdateField).toHaveBeenCalledWith({ key: 'status', value: 'in-progress' });
  });

  it('it should call onUpdateField when changing syncAlerts setting', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseActionBar {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="sync-alerts-switch"]').first().simulate('click');

    expect(onUpdateField).toHaveBeenCalledWith({
      key: 'settings',
      value: {
        syncAlerts: false,
      },
    });
  });
});
