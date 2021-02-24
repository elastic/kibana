/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertToDate } from './utils';

describe('convertToDate', () => {
  it('converts the English-only server timestamps to a parseable Date', () => {
    const serverDateString = 'January 01, 1970 at 12:00PM';
    const date = convertToDate(serverDateString);

    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toEqual(1970);
  });
});
