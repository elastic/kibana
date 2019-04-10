/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { mockGlobalState, TestProviders } from '../../mock';
import { createStore, State } from '../../store';

import { SuperDatePicker, SuperDatePickerComponent, SuperDatePickerState } from '.';

describe('SIEM Super Date Picker', () => {
  describe('#SuperDatePickerComponent', () => {
    const mockCardItemsData = {
      end: 1554743732995,
      id: 'global',
      isLoading: false,
      setAbsoluteSuperDatePicker: jest.fn(),
      start: 1554570932995,
      refetch: [],
    };
    afterEach(() => {
      mockCardItemsData.setAbsoluteSuperDatePicker.mockClear();
    });
    test('it renders when given dates', () => {
      // @ts-ignore
      const wrapper = shallow(<SuperDatePickerComponent {...mockCardItemsData} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });
    describe('onTimeChange', () => {
      test('it calls setAbsoluteSuperDatePicker when given absolute dates', () => {
        // @ts-ignore
        const wrapper = shallow(<SuperDatePickerComponent {...mockCardItemsData} />);
        const instance = wrapper.instance();
        // @ts-ignore
        instance.onTimeChange({
          start: '2019-04-06T18:24:31.723Z',
          end: '2019-04-08T18:24:31.723Z',
        });
        expect(mockCardItemsData.setAbsoluteSuperDatePicker).toHaveBeenCalledWith({
          from: 1554575071723,
          id: 'global',
          to: 1554747871723,
        });
      });
      test('it calls setAbsoluteSuperDatePicker with epoch when given relative dates', () => {
        // @ts-ignore
        const wrapper = shallow(<SuperDatePickerComponent {...mockCardItemsData} />);
        const instance = wrapper.instance();
        // @ts-ignore
        instance.onTimeChange({
          start: 'now-1d',
          end: '2032-04-07T18:24:31.723Z',
        });
        expect(
          mockCardItemsData.setAbsoluteSuperDatePicker.mock.calls[0][0].from.toString().length
        ).toEqual(13);
      });
      test('returns recentlyUsedRanges array', () => {
        // @ts-ignore
        const wrapper = shallow(<SuperDatePickerComponent {...mockCardItemsData} />);
        const instance = wrapper.instance();
        // @ts-ignore
        instance.onTimeChange({
          start: '2019-04-06T18:24:31.723Z',
          end: '2019-04-08T18:24:31.723Z',
        });
        // @ts-ignore
        const instanceState: SuperDatePickerState = instance.state;
        expect(instanceState.recentlyUsedRanges.length).toEqual(1);
        expect(instanceState.recentlyUsedRanges[0]).toMatchObject({
          start: '2019-04-06T18:24:31.723Z',
          end: '2019-04-08T18:24:31.723Z',
        });
      });

      test('adds new value to recentlyUsedRanges', () => {
        // @ts-ignore
        const wrapper = shallow(<SuperDatePickerComponent {...mockCardItemsData} />);
        const recentlyUsedRanges = [
          {
            start: '2019-04-06T18:24:31.723Z',
            end: '2019-04-08T18:24:31.723Z',
          },
          {
            start: '2019-04-01T18:24:31.723Z',
            end: '2019-04-02T18:24:31.723Z',
          },
        ];
        wrapper.setState({
          recentlyUsedRanges,
        });
        const instance = wrapper.instance();
        // @ts-ignore
        let instanceState: SuperDatePickerState = instance.state;
        expect(instanceState.recentlyUsedRanges.length).toEqual(2);
        // @ts-ignore
        instance.onTimeChange({
          start: '2019-03-06T18:24:31.723Z',
          end: '2019-03-08T18:24:31.723Z',
        });
        // @ts-ignore
        instanceState = instance.state;
        expect(instanceState.recentlyUsedRanges.length).toEqual(3);
      });
      test('keeps recentlyUsedRanges array at a length of 10 max', () => {
        // @ts-ignore
        const wrapper = shallow(<SuperDatePickerComponent {...mockCardItemsData} />);
        wrapper.setState({
          recentlyUsedRanges: [
            {
              start: '2019-04-06T18:24:31.723Z',
              end: '2019-04-08T18:24:31.723Z',
            },
            {
              start: '2019-04-01T18:24:31.723Z',
              end: '2019-04-02T18:24:31.723Z',
            },
            {
              start: '2019-04-03T18:24:31.723Z',
              end: '2019-04-04T18:24:31.723Z',
            },
            {
              start: '2019-04-01T18:24:31.723Z',
              end: '2019-04-03T18:24:31.723Z',
            },
            {
              start: '2019-04-01T18:24:31.723Z',
              end: '2019-04-04T18:24:31.723Z',
            },
            {
              start: '2019-04-05T18:24:31.723Z',
              end: '2019-04-06T18:24:31.723Z',
            },
            {
              start: '2019-04-04T18:24:31.723Z',
              end: '2019-04-06T18:24:31.723Z',
            },
            {
              start: '2019-04-03T18:24:31.723Z',
              end: '2019-04-06T18:24:31.723Z',
            },
            {
              start: '2016-04-01T18:24:31.723Z',
              end: '2016-04-05T18:24:31.723Z',
            },
            {
              start: '2017-04-03T18:24:31.723Z',
              end: '2017-04-05T18:24:31.723Z',
            },
          ],
        });
        const instance = wrapper.instance();
        // @ts-ignore
        let instanceState: SuperDatePickerState = instance.state;

        expect(instanceState.recentlyUsedRanges.length).toEqual(10);
        expect(instanceState.recentlyUsedRanges[9]).toMatchObject({
          start: '2017-04-03T18:24:31.723Z',
          end: '2017-04-05T18:24:31.723Z',
        });
        // @ts-ignore
        instance.onTimeChange({
          start: '2019-03-06T18:24:31.723Z',
          end: '2019-03-08T18:24:31.723Z',
        });
        // @ts-ignore
        instanceState = instance.state;
        expect(instanceState.recentlyUsedRanges.length).toEqual(10);
        expect(instanceState.recentlyUsedRanges[9]).toMatchObject({
          start: '2016-04-01T18:24:31.723Z',
          end: '2016-04-05T18:24:31.723Z',
        });
      });

      test('does not allow duplicates in recentlyUsedRanges', () => {
        // @ts-ignore -- TODO: EuiSuperDatePicker needs isLoading in prop-types
        const wrapper = shallow(<SuperDatePickerComponent {...mockCardItemsData} />);
        const recentlyUsedRanges = [
          {
            start: '2019-04-06T18:24:31.723Z',
            end: '2019-04-08T18:24:31.723Z',
          },
          {
            start: '2019-04-01T18:24:31.723Z',
            end: '2019-04-02T18:24:31.723Z',
          },
        ];
        wrapper.setState({
          recentlyUsedRanges,
        });
        const instance = wrapper.instance();
        // @ts-ignore
        let instanceState: SuperDatePickerState = instance.state;

        expect(instanceState.recentlyUsedRanges.length).toEqual(2);
        // @ts-ignore
        instance.onTimeChange({
          start: '2019-04-06T18:24:31.723Z',
          end: '2019-04-08T18:24:31.723Z',
        });
        // @ts-ignore
        instanceState = instance.state;
        expect(instanceState.recentlyUsedRanges.length).toEqual(2);
      });
    });
  });

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
