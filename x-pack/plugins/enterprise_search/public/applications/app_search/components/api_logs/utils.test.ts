/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDateString } from './utils';

describe('getDateString', () => {
  const mockDate = jest
    .spyOn(global.Date, 'now')
    .mockImplementation(() => new Date('1970-01-02').valueOf());

  it('gets the current date in ISO format', () => {
    expect(getDateString()).toEqual('1970-01-02T00:00:00.000Z');
  });

  it('allows passing a number of days to offset the timestamp by', () => {
    expect(getDateString(-1)).toEqual('1970-01-01T00:00:00.000Z');
    expect(getDateString(10)).toEqual('1970-01-12T00:00:00.000Z');
  });

  afterAll(() => mockDate.mockRestore());
});
