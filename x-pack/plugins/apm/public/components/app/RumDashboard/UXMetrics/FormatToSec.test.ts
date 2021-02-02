/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatToSec } from './KeyUXMetrics';

describe('FormatToSec', () => {
  test('it returns the expected value', () => {
    expect(formatToSec(3413000)).toStrictEqual('3.41 s');
    expect(formatToSec(15548000)).toStrictEqual('15.55 s');
    expect(formatToSec(1147.5, 'ms')).toStrictEqual('1.15 s');
    expect(formatToSec(114, 'ms')).toStrictEqual('114 ms');
    expect(formatToSec(undefined, 'ms')).toStrictEqual('0 ms');
    expect(formatToSec(undefined)).toStrictEqual('0 ms');
    expect(formatToSec('1123232')).toStrictEqual('1.12 s');
  });
});
