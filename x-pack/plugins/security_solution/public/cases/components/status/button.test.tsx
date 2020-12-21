/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { CaseStatuses } from '../../../../../case/common/api';
import { StatusActionButton } from './button';

describe('StatusActionButton', () => {
  const onStatusChanged = jest.fn();

  it('it renders', async () => {
    const wrapper = mount(
      <StatusActionButton
        status={CaseStatuses.open}
        disabled={false}
        isLoading={false}
        onStatusChanged={onStatusChanged}
      />
    );

    expect(wrapper.find(`[data-test-subj="case-view-status-action-button"]`).exists()).toBeTruthy();
  });

  describe('Button icons', () => {
    it('it renders the correct button icon: status open', async () => {
      const wrapper = mount(
        <StatusActionButton
          status={CaseStatuses.open}
          disabled={false}
          isLoading={false}
          onStatusChanged={onStatusChanged}
        />
      );

      expect(
        wrapper.find(`[data-test-subj="case-view-status-action-button"]`).first().prop('iconType')
      ).toBe('folderExclamation');
    });

    it('it renders the correct button icon: status in-progress', async () => {
      const wrapper = mount(
        <StatusActionButton
          status={CaseStatuses['in-progress']}
          disabled={false}
          isLoading={false}
          onStatusChanged={onStatusChanged}
        />
      );

      expect(
        wrapper.find(`[data-test-subj="case-view-status-action-button"]`).first().prop('iconType')
      ).toBe('folderCheck');
    });

    it('it renders the correct button icon: status closed', async () => {
      const wrapper = mount(
        <StatusActionButton
          status={CaseStatuses.closed}
          disabled={false}
          isLoading={false}
          onStatusChanged={onStatusChanged}
        />
      );

      expect(
        wrapper.find(`[data-test-subj="case-view-status-action-button"]`).first().prop('iconType')
      ).toBe('folderCheck');
    });
  });

  describe('Status rotation', () => {
    it('rotates correctly to in-progress when status is open', async () => {
      const wrapper = mount(
        <StatusActionButton
          status={CaseStatuses.open}
          disabled={false}
          isLoading={false}
          onStatusChanged={onStatusChanged}
        />
      );

      wrapper
        .find(`button[data-test-subj="case-view-status-action-button"]`)
        .first()
        .simulate('click');
      expect(onStatusChanged).toHaveBeenCalledWith('in-progress');
    });

    it('rotates correctly to closed when status is in-progress', async () => {
      const wrapper = mount(
        <StatusActionButton
          status={CaseStatuses['in-progress']}
          disabled={false}
          isLoading={false}
          onStatusChanged={onStatusChanged}
        />
      );

      wrapper
        .find(`button[data-test-subj="case-view-status-action-button"]`)
        .first()
        .simulate('click');
      expect(onStatusChanged).toHaveBeenCalledWith('closed');
    });

    it('rotates correctly to open when status is closed', async () => {
      const wrapper = mount(
        <StatusActionButton
          status={CaseStatuses.closed}
          disabled={false}
          isLoading={false}
          onStatusChanged={onStatusChanged}
        />
      );

      wrapper
        .find(`button[data-test-subj="case-view-status-action-button"]`)
        .first()
        .simulate('click');
      expect(onStatusChanged).toHaveBeenCalledWith('open');
    });
  });
});
