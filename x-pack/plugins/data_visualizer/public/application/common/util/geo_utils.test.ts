/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUniqCoordinates } from './geo_utils';

describe('geo type utils', () => {
  describe('getUniqCoordinates', () => {
    test('should remove duplicated coordinates', () => {
      expect(
        getUniqCoordinates([
          { coordinates: [0.0001, 2343], type: 'Point' },
          { coordinates: [0.0001, 2343], type: 'Point' },
          { coordinates: [0.0001, 2343], type: 'Point' },
          { coordinates: [0.0001, 2343], type: 'Shape' },
          { coordinates: [0.0001, 2343] },
          { coordinates: [4321, 2343], type: 'Point' },
          { coordinates: [4321, 2343], type: 'Point' },
        ])
      ).toMatchObject([
        {
          coordinates: [0.0001, 2343],
          type: 'Point',
        },
        {
          coordinates: [0.0001, 2343],
          type: 'Shape',
        },
        {
          coordinates: [0.0001, 2343],
        },
        {
          coordinates: [4321, 2343],
          type: 'Point',
        },
      ]);
      expect(
        getUniqCoordinates([
          { coordinates: [1000, 2000, 3000], type: 'Point' },
          { coordinates: [1000, 2000, 3000], type: 'Point' },
          { coordinates: [1000, 2000, 3000], type: 'Point' },
          { coordinates: [1000, 2000, 3000, 4000], type: 'Shape' },
          { coordinates: [1000, 2000, 3000, 4000] },
        ])
      ).toMatchObject([
        {
          coordinates: [1000, 2000, 3000],
          type: 'Point',
        },
        { coordinates: [1000, 2000, 3000, 4000], type: 'Shape' },
        { coordinates: [1000, 2000, 3000, 4000] },
      ]);
    });
  });
});
