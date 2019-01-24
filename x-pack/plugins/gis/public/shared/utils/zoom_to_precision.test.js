/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getGeohashPrecisionForZoom } from './zoom_to_precision';

describe('zoom_to_precision', () => {

  it('.getPrecision should clamp correctly', () => {

    let geohashPrecision = getGeohashPrecisionForZoom(-1);
    expect(geohashPrecision).toEqual(1);

    geohashPrecision = getGeohashPrecisionForZoom(40);
    expect(geohashPrecision).toEqual(12);

    geohashPrecision = getGeohashPrecisionForZoom(20);
    expect(geohashPrecision).toEqual(9);
    geohashPrecision = getGeohashPrecisionForZoom(19);
    expect(geohashPrecision).toEqual(9);

  });

});
