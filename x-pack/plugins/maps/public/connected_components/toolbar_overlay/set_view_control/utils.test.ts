/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ddToMGRS, mgrsToDD, ddToUTM, utmToDD } from './utils';

describe('MGRS', () => {
  test('ddToMGRS should convert lat lon to MGRS', () => {
    expect(ddToMGRS(29.29926, 32.05495)).toEqual('36RVT08214151');
  });

  test('ddToMGRS should return empty string for lat lon that does not translate to MGRS grid', () => {
    expect(ddToMGRS(90, 32.05495)).toEqual('');
  });

  test('mgrsToDD should convert MGRS to lat lon', () => {
    expect(mgrsToDD('36RVT08214151')).toEqual({
      east: 32.05498649594143,
      north: 29.299330195900975,
      south: 29.299239224067065,
      west: 32.054884373627345,
    });
  });
});

describe('UTM', () => {
  test('ddToUTM should convert lat lon to UTM', () => {
    expect(ddToUTM(29.29926, 32.05495)).toEqual({
      easting: '408216',
      northing: '3241512',
      zone: '36R',
    });
  });

  test('ddToUTM should return empty strings for lat lon that does not translate to UTM grid', () => {
    expect(ddToUTM(90, 32.05495)).toEqual({
      northing: '',
      easting: '',
      zone: '',
    });
  });

  test('utmToDD should convert UTM to lat lon', () => {
    expect(utmToDD('3241512', '408216', '36R')).toEqual({
      lat: 29.29925770984472,
      lon: 32.05494597943409,
    });
  });
});
