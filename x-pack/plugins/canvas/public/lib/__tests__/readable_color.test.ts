/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readableColor } from '../readable_color';

describe('readableColor', () => {
  test('light', () => {
    expect(readableColor('#000')).toEqual('#FFF');
    expect(readableColor('#000', '#EEE', '#111')).toEqual('#EEE');
    expect(readableColor('#111')).toEqual('#FFF');
    expect(readableColor('#111', '#EEE', '#111')).toEqual('#EEE');
  });
  test('dark', () => {
    expect(readableColor('#FFF')).toEqual('#333');
    expect(readableColor('#FFF', '#EEE', '#111')).toEqual('#111');
    expect(readableColor('#EEE')).toEqual('#333');
    expect(readableColor('#EEE', '#EEE', '#111')).toEqual('#111');
  });
});
