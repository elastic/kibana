/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { mockGlobalState } from '../../mock';
import { createStore, State } from '../../store';

import { SuperDatePicker } from '.';

describe('SIEM Super Date Picker', () => {
  describe('#SuperDatePicker', () => {
    const state: State = mockGlobalState;
    let store = createStore(state);

    beforeEach(() => {
      jest.clearAllMocks();
      store = createStore(state);
    });

    describe('Pick Relative Date', () => {
      let wrapper = mount(
        <ReduxStoreProvider store={store}>
          <SuperDatePicker id="global" />
        </ReduxStoreProvider>
      );
      beforeEach(() => {
        wrapper = mount(
          <ReduxStoreProvider store={store}>
            <SuperDatePicker id="global" />
          </ReduxStoreProvider>
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
      });

      test('Make Sure it is relative date', () => {
        expect(store.getState().inputs.global.timerange.kind).toBe('relative');
      });

      test('Make Sure it is last 15 minutes date', () => {
        expect(store.getState().inputs.global.timerange.fromStr).toBe('now-15m');
        expect(store.getState().inputs.global.timerange.toStr).toBe('now');
      });

      test('Make Sure it is Today date', () => {
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
        expect(store.getState().inputs.global.timerange.fromStr).toBe('now/d');
        expect(store.getState().inputs.global.timerange.toStr).toBe('now/d');
      });

      test('Make Sure it is this week', () => {
        wrapper
          .find('[data-test-subj="superDatePickerToggleQuickMenuButton"]')
          .first()
          .simulate('click');
        wrapper.update();

        wrapper
          .find('[data-test-subj="superDatePickerCommonlyUsed_This_week"]')
          .first()
          .simulate('click');
        wrapper.update();
        expect(store.getState().inputs.global.timerange.fromStr).toBe('now/w');
        expect(store.getState().inputs.global.timerange.toStr).toBe('now/w');
      });

      test('Make Sure it is week to date', () => {
        wrapper
          .find('[data-test-subj="superDatePickerToggleQuickMenuButton"]')
          .first()
          .simulate('click');
        wrapper.update();

        wrapper
          .find('[data-test-subj="superDatePickerCommonlyUsed_Week_to date"]')
          .first()
          .simulate('click');
        wrapper.update();
        expect(store.getState().inputs.global.timerange.fromStr).toBe('now/w');
        expect(store.getState().inputs.global.timerange.toStr).toBe('now');
      });

      test('Make Sure to (end date) is superior than from (start date)', () => {
        expect(store.getState().inputs.global.timerange.to).toBeGreaterThan(
          store.getState().inputs.global.timerange.from
        );
      });
    });

    describe('Recently used date ranges', () => {
      let wrapper = mount(
        <ReduxStoreProvider store={store}>
          <SuperDatePicker id="global" />
        </ReduxStoreProvider>
      );
      beforeEach(() => {
        wrapper = mount(
          <ReduxStoreProvider store={store}>
            <SuperDatePicker id="global" />
          </ReduxStoreProvider>
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
      });

      test('Today is in Recently used date ranges', () => {
        expect(
          wrapper
            .find('div.euiQuickSelectPopover__section')
            .at(1)
            .text()
        ).toBe('Today');
      });

      test('Today and Last 15 minutes are in Recently used date ranges', () => {
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

        expect(
          wrapper
            .find('div.euiQuickSelectPopover__section')
            .at(1)
            .text()
        ).toBe('Last 15 minutesToday');
      });

      test('Today and Year to date is in Recently used date ranges', () => {
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

        expect(
          wrapper
            .find('div.euiQuickSelectPopover__section')
            .at(1)
            .text()
        ).toBe('Year to dateToday');
      });

      test('Today and Last 15 minutes and Year to date is in Recently used date ranges', () => {
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
          .find('[data-test-subj="superDatePickerCommonlyUsed_Year_to date"]')
          .first()
          .simulate('click');
        wrapper.update();

        expect(
          wrapper
            .find('div.euiQuickSelectPopover__section')
            .at(1)
            .text()
        ).toBe('Year to dateLast 15 minutesToday');
      });

      test('Make sure that it does not add any duplicate if you click again on today', () => {
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

        expect(
          wrapper
            .find('div.euiQuickSelectPopover__section')
            .at(1)
            .text()
        ).toBe('Today');
      });
    });

    describe('Refresh Every', () => {
      let wrapper = mount(
        <ReduxStoreProvider store={store}>
          <SuperDatePicker id="global" />
        </ReduxStoreProvider>
      );
      beforeEach(() => {
        wrapper = mount(
          <ReduxStoreProvider store={store}>
            <SuperDatePicker id="global" />
          </ReduxStoreProvider>
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
      });

      test('Make sure the duration get updated to 2 minutes === 120000ms', () => {
        expect(store.getState().inputs.global.policy.duration).toEqual(120000);
      });

      test('Make sure the stream live started', () => {
        expect(store.getState().inputs.global.policy.kind).toBe('interval');
      });

      test('Make sure we can stop the stream live', () => {
        wrapper
          .find('[data-test-subj="superDatePickerToggleQuickMenuButton"]')
          .first()
          .simulate('click');
        wrapper.update();

        wrapper
          .find('[data-test-subj="superDatePickerToggleRefreshButton"]')
          .first()
          .simulate('click');
        wrapper.update();

        expect(store.getState().inputs.global.policy.kind).toBe('manual');
      });
    });

    describe('Pick Absolute Date', () => {
      let wrapper = mount(
        <ReduxStoreProvider store={store}>
          <SuperDatePicker id="global" />
        </ReduxStoreProvider>
      );
      beforeEach(() => {
        wrapper = mount(
          <ReduxStoreProvider store={store}>
            <SuperDatePicker id="global" />
          </ReduxStoreProvider>
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

        wrapper
          .find('button[data-test-subj="superDatePickerApplyTimeButton"]')
          .first()
          .simulate('click');
        wrapper.update();
      });
      test.skip('Make sure it is an absolute Date', () => {
        expect(store.getState().inputs.global.timerange.kind).toBe('absolute');
      });

      test.skip('Make sure that the date in store match with the one selected', () => {
        const selectedDate =
          wrapper.find('input[data-test-subj="superDatePickerAbsoluteDateInput"]').props().value ||
          '';
        expect(new Date(store.getState().inputs.global.timerange.from).toISOString()).toBe(
          new Date(selectedDate as string).toISOString()
        );
      });
    });
  });
});
