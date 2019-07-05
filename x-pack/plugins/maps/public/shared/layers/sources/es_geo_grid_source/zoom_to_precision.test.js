/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getGeohashPrecisionForZoom } from './zoom_to_precision';

it('getGeohashPrecisionForZoom', () => {
  expect(getGeohashPrecisionForZoom(-1)).toEqual(1);
  expect(getGeohashPrecisionForZoom(40)).toEqual(12);
  expect(getGeohashPrecisionForZoom(20)).toEqual(9);
  expect(getGeohashPrecisionForZoom(19)).toEqual(9);
});
