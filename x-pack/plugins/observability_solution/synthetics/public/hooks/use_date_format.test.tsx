/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { i18n } from '@kbn/i18n';

jest.mock('@kbn/i18n', () => ({
  i18n: {
    getLocale: jest.fn().mockReturnValue(undefined),
  },
}));

import { useDateFormat } from './use_date_format';

describe('useDateFormat', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  Object.defineProperty(global.navigator, 'language', {
    value: 'en-US',
    writable: true,
  });
  it('returns a formatter function that makes a date into the expected output', () => {
    const response = renderHook(() => useDateFormat());
    expect(response.result.current('2023-02-01 13:00:00')).toEqual('Feb 1, 2023 @ 1:00 PM');
  });
  it('adjusts formatter based on locale', () => {
    Object.defineProperty(global.navigator, 'language', {
      value: 'en-GB',
      writable: true,
    });
    const response = renderHook(() => useDateFormat());
    expect(response.result.current('2023-02-01 13:00:00')).toEqual('1 Feb 2023 @ 13:00');
  });
  it('prefers Kibana locale if set', () => {
    jest.spyOn(i18n, 'getLocale').mockReturnValue('fr-FR');

    Object.defineProperty(global.navigator, 'language', {
      value: 'en-GB',
      writable: true,
    });
    const response = renderHook(() => useDateFormat());
    expect(response.result.current('2023-02-01 13:00:00')).toEqual('1 févr. 2023 @ 13:00');
  });
});
