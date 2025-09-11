/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getFileName } from './utils';

describe('getFileName', () => {
  const mockDate = '2024-09-09T12:34:56.789Z';

  beforeAll(() => {
    jest.spyOn(moment.prototype, 'toISOString').mockReturnValue(mockDate);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns app_page_datetime when app and page are parsed from url', () => {
    const url = 'http://localhost:5601/app/slos/test?foo=bar';
    const fileName = getFileName(url);
    expect(fileName).toBe(`slos_test_${mockDate}`);
  });

  it('returns app_page_datetime when app and page are provided as args', () => {
    const url = 'http://localhost:5601/app/slos/test';
    const fileName = getFileName(url, 'slos', 'test-123');
    expect(fileName).toBe(`slos_test-123_${mockDate}`);
  });

  it('returns screenshot_datetime if url does not match expected pattern', () => {
    const url = 'http://localhost:5601/unknown/path';
    const fileName = getFileName(url);
    expect(fileName).toBe(`screenshot_${mockDate}`);
  });

  it('returns screenshot_datetime if url is empty', () => {
    const fileName = getFileName('');
    expect(fileName).toBe(`screenshot_${mockDate}`);
  });

  it('returns app_page_datetime if url has extra slashes', () => {
    const url = 'http://localhost:5601//app//slos//test';
    const fileName = getFileName(url);
    expect(fileName).toBe(`slos_test_${mockDate}`);
  });
});
