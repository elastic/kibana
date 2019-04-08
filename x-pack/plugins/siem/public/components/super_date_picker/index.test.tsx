/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { SuperDatePickerComponent, SuperDatePickerState } from '.';
describe('SIEM Super Date Picker', () => {
  const mockCardItemsData = {
    end: 1554743732995,
    id: 'global',
    isLoading: false,
    setAbsoluteSuperDatePicker: jest.fn(),
    start: 1554570932995,
  };
  afterEach(() => {
    mockCardItemsData.setAbsoluteSuperDatePicker.mockClear();
  });
  test('it renders when given dates', () => {
    const wrapper = shallow(<SuperDatePickerComponent {...mockCardItemsData} />);
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  describe('onTimeChange', () => {
    test('it calls setAbsoluteSuperDatePicker when given absolute dates', () => {
      const wrapper = shallow(<SuperDatePickerComponent {...mockCardItemsData} />);
      const instance = wrapper.instance();
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
      const wrapper = shallow(<SuperDatePickerComponent {...mockCardItemsData} />);
      const instance = wrapper.instance();
      instance.onTimeChange({
        start: 'now-1d',
        end: '2032-04-07T18:24:31.723Z',
      });
      expect(
        mockCardItemsData.setAbsoluteSuperDatePicker.mock.calls[0][0].from.toString().length
      ).toEqual(13);
    });
    test('returns recentlyUsedRanges array', () => {
      const wrapper = shallow(<SuperDatePickerComponent {...mockCardItemsData} />);
      const instance = wrapper.instance();
      instance.onTimeChange({
        start: '2019-04-06T18:24:31.723Z',
        end: '2019-04-08T18:24:31.723Z',
      });
      const instanceState: SuperDatePickerState = instance.state;
      expect(instanceState.recentlyUsedRanges.length).toEqual(1);
      expect(instanceState.recentlyUsedRanges[0]).toMatchObject({
        start: '2019-04-06T18:24:31.723Z',
        end: '2019-04-08T18:24:31.723Z',
      });
    });

    test('addes new value to recentlyUsedRanges', () => {
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

      expect(instance.state.recentlyUsedRanges.length).toEqual(2);
      instance.onTimeChange({
        start: '2019-03-06T18:24:31.723Z',
        end: '2019-03-08T18:24:31.723Z',
      });
      expect(instance.state.recentlyUsedRanges.length).toEqual(3);
    });
    test('keeps recentlyUsedRanges array at a length of 10 max', () => {
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

      expect(instance.state.recentlyUsedRanges.length).toEqual(10);
      expect(instance.state.recentlyUsedRanges[9]).toMatchObject({
        start: '2017-04-03T18:24:31.723Z',
        end: '2017-04-05T18:24:31.723Z',
      });
      instance.onTimeChange({
        start: '2019-03-06T18:24:31.723Z',
        end: '2019-03-08T18:24:31.723Z',
      });

      expect(instance.state.recentlyUsedRanges.length).toEqual(10);
      expect(instance.state.recentlyUsedRanges[9]).toMatchObject({
        start: '2016-04-01T18:24:31.723Z',
        end: '2016-04-05T18:24:31.723Z',
      });
    });

    test('does not allow duplicates in recentlyUsedRanges', () => {
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

      expect(instance.state.recentlyUsedRanges.length).toEqual(2);
      instance.onTimeChange({
        start: '2019-04-06T18:24:31.723Z',
        end: '2019-04-08T18:24:31.723Z',
      });
      expect(instance.state.recentlyUsedRanges.length).toEqual(2);
    });
  });
});
