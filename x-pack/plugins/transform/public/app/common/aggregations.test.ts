/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isAggName } from './aggregations';

describe('Transform: Aggregations', () => {
  test('isAggName()', () => {
    expect(isAggName('avg(responsetime)')).toEqual(true);
    expect(isAggName('avg_responsetime')).toEqual(true);
    expect(isAggName('avg[responsetime]')).toEqual(false);
    expect(isAggName('avg<responsetime>')).toEqual(false);
    expect(isAggName('avg responsetime')).toEqual(true);
    expect(isAggName(' ')).toEqual(false);
    expect(isAggName(' avg responsetime')).toEqual(false);
    expect(isAggName('avg responsetime ')).toEqual(false);
    expect(isAggName(' avg responsetime ')).toEqual(false);
    expect(isAggName('date_histogram(@timestamp')).toEqual(true);
    expect(isAggName('os')).toEqual(true);
    expect(isAggName('v')).toEqual(true);
    expect(isAggName(' v')).toEqual(false);
    expect(isAggName('v ')).toEqual(false);
    expect(isAggName(' os ')).toEqual(false);
    expect(isAggName('[os]')).toEqual(false);
    expect(isAggName('>os]')).toEqual(false);
  });
});
