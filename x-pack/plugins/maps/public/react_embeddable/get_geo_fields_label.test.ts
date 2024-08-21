/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGeoFieldsLabel } from './get_geo_fields_label';

test('single field', () => {
  expect(getGeoFieldsLabel(['location'])).toEqual('location');
});

test('two fields', () => {
  expect(getGeoFieldsLabel(['location', 'secondLocation'])).toEqual('location and secondLocation');
});

test('three or more fields', () => {
  expect(getGeoFieldsLabel(['location', 'secondLocation', 'thirdLocation'])).toEqual(
    'location, secondLocation, and thirdLocation'
  );
});
