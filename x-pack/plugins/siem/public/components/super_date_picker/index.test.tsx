/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { DEFAULT_TIMEPICKER_QUICK_RANGES } from '../../../common/constants';
import { useUiSetting$ } from '../../lib/kibana';
import { apolloClientObservable, mockGlobalState } from '../../mock';
import { createUseUiSetting$Mock } from '../../mock/kibana_react';
import { createStore, State } from '../../store';

import { SuperDatePicker, makeMapStateToProps } from '.';
import { cloneDeep } from 'lodash/fp';

jest.mock('../../lib/kibana');
const mockUseUiSetting$ = useUiSetting$ as jest.Mock;
const timepickerRanges = [
  {
    from: 'now/d',
    to: 'now/d',
    display: 'Today',
  },
  {
    from: 'now/w',
    to: 'now/w',
    display: 'This week',
  },
  {
    from: 'now-15m',
    to: 'now',
    display: 'Last 15 minutes',
  },
  {
    from: 'now-30m',
    to: 'now',
    display: 'Last 30 minutes',
  },
  {
    from: 'now-1h',
    to: 'now',
    display: 'Last 1 hour',
  },
  {
    from: 'now-24h',
    to: 'now',
    display: 'Last 24 hours',
  },
  {
    from: 'now-7d',
    to: 'now',
    display: 'Last 7 days',
  },
  {
    from: 'now-30d',
    to: 'now',
    display: 'Last 30 days',
  },
  {
    from: 'now-90d',
    to: 'now',
    display: 'Last 90 days',
  },
  {
    from: 'now-1y',
    to: 'now',
    display: 'Last 1 year',
  },
];

describe('SIEM Super Date Picker', () => {
  describe('#SuperDatePicker', () => {
    const state: State = mockGlobalState;
    let store = createStore(state, apolloClientObservable);

    beforeEach(() => {
      jest.clearAllMocks();
      store = createStore(state, apolloClientObservable);
      mockUseUiSetting$.mockImplementation((key, defaultValue) => {
        const useUiSetting$Mock = createUseUiSetting$Mock();

        return key === DEFAULT_TIMEPICKER_QUICK_RANGES
          ? [timepickerRanges, jest.fn()]
          : useUiSetting$Mock(key, defaultValue);
      });
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

      test('Make Sure it is last 24 hours date', () => {
        expect(store.getState().inputs.global.timerange.fromStr).toBe('now-24h');
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

      test('Today and Last 24 hours are in Recently used date ranges', () => {
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
        ).toBe('Last 24 hoursToday');
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
    });

    describe('#makeMapStateToProps', () => {
      test('it should return the same shallow references given the same input twice', () => {
        const mapStateToProps = makeMapStateToProps();
        const props1 = mapStateToProps(state, { id: 'global' });
        const props2 = mapStateToProps(state, { id: 'global' });
        Object.keys(props1).forEach(key => {
          expect((props1 as Record<string, {}>)[key]).toBe((props2 as Record<string, {}>)[key]);
        });
      });

      test('it should not return the same reference if policy kind is different', () => {
        const mapStateToProps = makeMapStateToProps();
        const props1 = mapStateToProps(state, { id: 'global' });
        const clone = cloneDeep(state);
        clone.inputs.global.policy.kind = 'interval';
        const props2 = mapStateToProps(clone, { id: 'global' });
        expect(props1.policy).not.toBe(props2.policy);
      });

      test('it should not return the same reference if duration is different', () => {
        const mapStateToProps = makeMapStateToProps();
        const props1 = mapStateToProps(state, { id: 'global' });
        const clone = cloneDeep(state);
        clone.inputs.global.policy.duration = 99999;
        const props2 = mapStateToProps(clone, { id: 'global' });
        expect(props1.duration).not.toBe(props2.duration);
      });

      test('it should not return the same reference if timerange kind is different', () => {
        const mapStateToProps = makeMapStateToProps();
        const props1 = mapStateToProps(state, { id: 'global' });
        const clone = cloneDeep(state);
        clone.inputs.global.timerange.kind = 'absolute';
        const props2 = mapStateToProps(clone, { id: 'global' });
        expect(props1.kind).not.toBe(props2.kind);
      });

      test('it should not return the same reference if timerange from is different', () => {
        const mapStateToProps = makeMapStateToProps();
        const props1 = mapStateToProps(state, { id: 'global' });
        const clone = cloneDeep(state);
        clone.inputs.global.timerange.from = 999;
        const props2 = mapStateToProps(clone, { id: 'global' });
        expect(props1.start).not.toBe(props2.start);
      });

      test('it should not return the same reference if timerange to is different', () => {
        const mapStateToProps = makeMapStateToProps();
        const props1 = mapStateToProps(state, { id: 'global' });
        const clone = cloneDeep(state);
        clone.inputs.global.timerange.to = 999;
        const props2 = mapStateToProps(clone, { id: 'global' });
        expect(props1.end).not.toBe(props2.end);
      });

      test('it should not return the same reference of toStr if toStr different', () => {
        const mapStateToProps = makeMapStateToProps();
        const props1 = mapStateToProps(state, { id: 'global' });
        const clone = cloneDeep(state);
        clone.inputs.global.timerange.toStr = 'some other string';
        const props2 = mapStateToProps(clone, { id: 'global' });
        expect(props1.toStr).not.toBe(props2.toStr);
      });

      test('it should not return the same reference of fromStr if fromStr different', () => {
        const mapStateToProps = makeMapStateToProps();
        const props1 = mapStateToProps(state, { id: 'global' });
        const clone = cloneDeep(state);
        clone.inputs.global.timerange.fromStr = 'some other string';
        const props2 = mapStateToProps(clone, { id: 'global' });
        expect(props1.fromStr).not.toBe(props2.fromStr);
      });

      test('it should not return the same reference of isLoadingSelector if the query different', () => {
        const mapStateToProps = makeMapStateToProps();
        const props1 = mapStateToProps(state, { id: 'global' });
        const clone = cloneDeep(state);
        clone.inputs.global.queries = [
          {
            loading: true,
            id: '1',
            inspect: { dsl: [], response: [] },
            isInspected: false,
            refetch: null,
            selectedInspectIndex: 0,
          },
        ];
        const props2 = mapStateToProps(clone, { id: 'global' });
        expect(props1.isLoading).not.toBe(props2.isLoading);
      });

      test('it should not return the same reference of refetchSelector if the query different', () => {
        const mapStateToProps = makeMapStateToProps();
        const props1 = mapStateToProps(state, { id: 'global' });
        const clone = cloneDeep(state);
        clone.inputs.global.queries = [
          {
            loading: true,
            id: '1',
            inspect: { dsl: [], response: [] },
            isInspected: false,
            refetch: null,
            selectedInspectIndex: 0,
          },
        ];
        const props2 = mapStateToProps(clone, { id: 'global' });
        expect(props1.queries).not.toBe(props2.queries);
      });
    });
  });
});
