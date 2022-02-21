/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';

import { getDateString, getStatusColor, attemptToFormatJson } from './utils';

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

describe('getStatusColor', () => {
  it('returns a valid EUI badge color based on the status code', () => {
    expect(getStatusColor(200)).toEqual('success');
    expect(getStatusColor(301)).toEqual('primary');
    expect(getStatusColor(404)).toEqual('warning');
    expect(getStatusColor(503)).toEqual('danger');
  });
});

describe('attemptToFormatJson', () => {
  it('takes an unformatted JSON string and correctly newlines/indents it', () => {
    expect(attemptToFormatJson('{"hello":"world","lorem":{"ipsum":"dolor","sit":"amet"}}'))
      .toEqual(dedent`{
        "hello": "world",
        "lorem": {
          "ipsum": "dolor",
          "sit": "amet"
        }
      }`);
  });

  it('returns the original content if it is not properly formatted JSON', () => {
    expect(attemptToFormatJson('{invalid json}')).toEqual('{invalid json}');
  });
});
