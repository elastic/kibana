/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, mockKibanaValues } from '../../../../__mocks__/kea_logic';

import React, { ReactElement } from 'react';

import { shallow, ShallowWrapper } from 'enzyme';
import moment, { Moment } from 'moment';

import { EuiSelect, EuiDatePickerRange, EuiButton } from '@elastic/eui';

import { DEFAULT_START_DATE, DEFAULT_END_DATE } from '../constants';

import { AnalyticsFilters } from '.';

describe('AnalyticsFilters', () => {
  const { history } = mockKibanaValues;

  const values = {
    allTags: ['All Analytics Tags'], // Comes from the server API
    history,
  };

  const newStartDateMoment = moment('1970-01-30');
  const newEndDateMoment = moment('1970-01-31');

  let wrapper: ShallowWrapper;
  const getTagsSelect = () => wrapper.find(EuiSelect);
  const getDateRangePicker = () => wrapper.find(EuiDatePickerRange);
  const getStartDatePicker = () => getDateRangePicker().prop('startDateControl') as ReactElement;
  const getEndDatePicker = () => getDateRangePicker().prop('endDateControl') as ReactElement;
  const getApplyButton = () => wrapper.find(EuiButton);

  beforeEach(() => {
    jest.clearAllMocks();
    history.location.search = '';
    setMockValues(values);
  });

  it('renders', () => {
    wrapper = shallow(<AnalyticsFilters />);

    expect(wrapper.find(EuiSelect)).toHaveLength(1);
    expect(wrapper.find(EuiDatePickerRange)).toHaveLength(1);
  });

  it('renders tags & dates with default values when no search query params are present', () => {
    wrapper = shallow(<AnalyticsFilters />);

    expect(getTagsSelect().prop('value')).toEqual('');
    expect(getStartDatePicker().props.startDate._i).toEqual(DEFAULT_START_DATE);
    expect(getEndDatePicker().props.endDate._i).toEqual(DEFAULT_END_DATE);
  });

  describe('tags select', () => {
    beforeEach(() => {
      history.location.search = '?tag=tag1';
      const allTags = [...values.allTags, 'tag1', 'tag2', 'tag3'];
      setMockValues({ ...values, allTags });

      wrapper = shallow(<AnalyticsFilters />);
    });

    it('renders the tags select with currentTag value and allTags options', () => {
      const tagsSelect = getTagsSelect();

      expect(tagsSelect.prop('value')).toEqual('tag1');
      expect(tagsSelect.prop('options')).toEqual([
        { value: '', text: 'All analytics tags' },
        { value: 'tag1', text: 'tag1' },
        { value: 'tag2', text: 'tag2' },
        { value: 'tag3', text: 'tag3' },
      ]);
    });

    it('updates currentTag on new tag select', () => {
      getTagsSelect().simulate('change', { target: { value: 'tag3' } });

      expect(getTagsSelect().prop('value')).toEqual('tag3');
    });
  });

  describe('date pickers', () => {
    beforeEach(() => {
      history.location.search = '?start=1970-01-01&end=1970-01-02';

      wrapper = shallow(<AnalyticsFilters />);
    });

    it('renders the start date picker', () => {
      const startDatePicker = getStartDatePicker();
      expect(startDatePicker.props.selected._i).toEqual('1970-01-01');
      expect(startDatePicker.props.startDate._i).toEqual('1970-01-01');
    });

    it('renders the end date picker', () => {
      const endDatePicker = getEndDatePicker();
      expect(endDatePicker.props.selected._i).toEqual('1970-01-02');
      expect(endDatePicker.props.endDate._i).toEqual('1970-01-02');
    });

    it('updates startDate on start date pick', () => {
      getStartDatePicker().props.onChange(newStartDateMoment);

      expect(getStartDatePicker().props.startDate._i).toEqual('1970-01-30');
    });

    it('updates endDate on start date pick', () => {
      getEndDatePicker().props.onChange(newEndDateMoment);

      expect(getEndDatePicker().props.endDate._i).toEqual('1970-01-31');
    });
  });

  describe('invalid date ranges', () => {
    beforeEach(() => {
      history.location.search = '?start=1970-01-02&end=1970-01-01';

      wrapper = shallow(<AnalyticsFilters />);
    });

    it('renders the date pickers as invalid', () => {
      expect(getStartDatePicker().props.isInvalid).toEqual(true);
      expect(getEndDatePicker().props.isInvalid).toEqual(true);
    });

    it('disables the apply button', () => {
      expect(getApplyButton().prop('isDisabled')).toEqual(true);
    });
  });

  describe('applying filters', () => {
    const updateState = ({ start, end, tag }: { start: Moment; end: Moment; tag: string }) => {
      getTagsSelect().simulate('change', { target: { value: tag } });
      getStartDatePicker().props.onChange(start);
      getEndDatePicker().props.onChange(end);
    };

    beforeEach(() => {
      wrapper = shallow(<AnalyticsFilters />);
    });

    it('pushes up new tag & date state to the search query', () => {
      updateState({ start: newStartDateMoment, end: newEndDateMoment, tag: 'tag2' });
      getApplyButton().simulate('click');

      expect(history.push).toHaveBeenCalledWith({
        search: 'end=1970-01-31&start=1970-01-30&tag=tag2',
      });
    });

    it('does not push up the tag param if empty (set to all tags)', () => {
      updateState({ start: newStartDateMoment, end: newEndDateMoment, tag: '' });
      getApplyButton().simulate('click');

      expect(history.push).toHaveBeenCalledWith({
        search: 'end=1970-01-31&start=1970-01-30',
      });
    });
  });
});
