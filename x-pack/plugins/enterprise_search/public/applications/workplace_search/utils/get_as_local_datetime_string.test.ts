/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAsLocalDateTimeString } from '.';

describe('getAsLocalDateTimeString', () => {
  it('returns localized date if string can be parsed as date', () => {
    const date = '2021-06-28';

    expect(getAsLocalDateTimeString(date)).toEqual(new Date(Date.parse(date)).toLocaleString());
  });

  it('returns null if passed value is not a string', () => {
    const date = ['1', '2'];

    expect(getAsLocalDateTimeString(date)).toEqual(null);
  });

  it('returns null if string cannot be parsed as date', () => {
    const date = 'foo';

    expect(getAsLocalDateTimeString(date)).toEqual(null);
  });
});
