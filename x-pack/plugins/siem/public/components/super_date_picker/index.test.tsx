/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { mockGlobalState, TestProviders } from '../../mock';
import { createStore, State } from '../../store';

import { SuperDatePicker } from '.';

describe('SIEM Super Date Picker', () => {
  describe('#SuperDatePicker', () => {
    const state: State = mockGlobalState;
    let store = createStore(state);

    beforeEach(() => {
      store = createStore(state);
    });

    test('Can select Today (it is a relative date)', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <SuperDatePicker id="global" />
        </TestProviders>
      );
      wrapper
        .find('[data-test-subj="superDatePickerToggleQuickMenuButton"]')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find('[data-test-subj="superDatePickerCommonlyUsed_Today"]')
        .first()
        .simulate('click');
      wrapper.update();

      expect(store.getState().inputs.global.timerange.kind).toBe('relative');
      expect(store.getState().inputs.global.timerange.option).toBe('now/d');
    });

    test('Recently used date ranges', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <SuperDatePicker id="global" />
        </TestProviders>
      );
      wrapper
        .find('[data-test-subj="superDatePickerToggleQuickMenuButton"]')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find('button.euiQuickSelect__applyButton')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find('[data-test-subj="superDatePickerToggleQuickMenuButton"]')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find('[data-test-subj="superDatePickerCommonlyUsed_Today"]')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find('[data-test-subj="superDatePickerToggleQuickMenuButton"]')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find('[data-test-subj="superDatePickerCommonlyUsed_Year_to date"]')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find('[data-test-subj="superDatePickerToggleQuickMenuButton"]')
        .first()
        .simulate('click');
      wrapper.update();

      expect(
        wrapper
          .find('div.euiQuickSelectPopover__section')
          .at(1)
          .text()
      ).toBe('Year to dateTodayLast 15 minutes');

      wrapper
        .find('[data-test-subj="superDatePickerCommonlyUsed_Year_to date"]')
        .first()
        .simulate('click');
      wrapper.update();

      expect(
        wrapper
          .find('div.euiQuickSelectPopover__section')
          .at(1)
          .text()
      ).toBe('Year to dateTodayLast 15 minutes');
    });

    test('Refresh Every', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <SuperDatePicker id="global" />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="superDatePickerToggleQuickMenuButton"]')
        .first()
        .simulate('click');
      wrapper.update();

      const wrapperFixedEuiFieldSearch = wrapper.find(
        'input[data-test-subj="superDatePickerRefreshIntervalInput"]'
      );
      wrapperFixedEuiFieldSearch.simulate('change', { target: { value: '2' } });
      wrapper.update();

      wrapper
        .find('[data-test-subj="superDatePickerToggleRefreshButton"]')
        .first()
        .simulate('click');
      wrapper.update();

      expect(store.getState().inputs.global.policy.duration).toEqual(120000);
      expect(store.getState().inputs.global.policy.kind).toBe('interval');

      wrapper
        .find('[data-test-subj="superDatePickerToggleRefreshButton"]')
        .first()
        .simulate('click');
      wrapper.update();

      expect(store.getState().inputs.global.policy.kind).toBe('manual');
    });

    test('Absolute Data', () => {
      const wrapper = mount(
        <TestProviders store={store}>
          <SuperDatePicker id="global" />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="superDatePickerShowDatesButton"]')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find('[data-test-subj="superDatePickerstartDatePopoverButton"]')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find('[data-test-subj="superDatePickerAbsoluteTab"]')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find('button.react-datepicker__navigation--previous')
        .first()
        .simulate('click');
      wrapper.update();

      wrapper
        .find('div.react-datepicker__day')
        .at(1)
        .simulate('click');
      wrapper.update();

      const selectedDate =
        wrapper.find('input[data-test-subj="superDatePickerAbsoluteDateInput"]').props().value ||
        '';

      wrapper
        .find('button[data-test-subj="superDatePickerApplyTimeButton"]')
        .first()
        .simulate('click');
      wrapper.update();

      expect(store.getState().inputs.global.timerange.kind).toBe('absolute');
      expect(new Date(store.getState().inputs.global.timerange.from).toISOString()).toBe(
        new Date(selectedDate as string).toISOString()
      );
    });
  });
});
