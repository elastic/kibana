/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSelectedForDatePicker } from './get_selected_for_date_picker';

describe('getSelectedForDatePicker', () => {
  afterAll(() => {
    jest.useRealTimers();
  });

  test('should return the current date if the form is not initialized', () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-03-30T00:00:00.000Z'));

    expect(getSelectedForDatePicker({}, 'date').toISOString()).toEqual('2023-03-30T00:00:00.000Z');
  });

  test('should return the form date if it is valid', () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-03-30T00:00:00.000Z'));

    expect(
      getSelectedForDatePicker({ date: '2023-01-30T00:00:00.000Z' }, 'date').toISOString()
    ).toEqual('2023-01-30T00:00:00.000Z');
  });

  test('should return the current date if the form date is not valid', () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-03-30T00:00:00.000Z'));

    expect(getSelectedForDatePicker({ date: 'test' }, 'date').toISOString()).toEqual(
      '2023-03-30T00:00:00.000Z'
    );
  });
});
