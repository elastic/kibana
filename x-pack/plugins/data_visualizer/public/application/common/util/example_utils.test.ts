/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUniqGeoOrStrExamples } from './example_utils';

describe('example utils', () => {
  describe('getUniqGeoOrStrExamples', () => {
    test('should remove duplicated strings up to maxExamples', () => {
      expect(
        getUniqGeoOrStrExamples(
          [
            'deb',
            '',
            'css',
            'deb',
            '',
            '',
            'deb',
            'gz',
            '',
            'gz',
            '',
            'deb',
            'gz',
            'deb',
            '',
            'deb',
            'deb',
            '',
            'gz',
            'gz',
          ],
          20
        )
      ).toMatchObject(['deb', '', 'css', 'gz']);
      expect(
        getUniqGeoOrStrExamples(
          [
            'deb',
            '',
            'css',
            'deb',
            '',
            '',
            'deb',
            'gz',
            '',
            'gz',
            '',
            'deb',
            'gz',
            'deb',
            '',
            'deb',
            'deb',
            '',
            'gz',
            'gz',
          ],
          2
        )
      ).toMatchObject(['deb', '']);
    });

    test('should remove duplicated coordinates up to maxExamples', () => {
      expect(
        getUniqGeoOrStrExamples([
          { coordinates: [0.1, 2343], type: 'Point' },
          { coordinates: [0.1, 2343], type: 'Point' },
          { coordinates: [0.1, 2343], type: 'Point' },
          { coordinates: [0.1, 2343], type: 'Shape' },
          { coordinates: [0.1, 2343] },
          { coordinates: [4321, 2343], type: 'Point' },
          { coordinates: [4321, 2343], type: 'Point' },
        ])
      ).toMatchObject([
        {
          coordinates: [0.1, 2343],
          type: 'Point',
        },
        {
          coordinates: [0.1, 2343],
          type: 'Shape',
        },
        {
          coordinates: [0.1, 2343],
        },
        {
          coordinates: [4321, 2343],
          type: 'Point',
        },
      ]);
      expect(
        getUniqGeoOrStrExamples([
          { coordinates: [1, 2, 3], type: 'Point' },
          { coordinates: [1, 2, 3], type: 'Point' },
          { coordinates: [1, 2, 3], type: 'Point' },
          { coordinates: [1, 2, 3, 4], type: 'Shape' },
          { coordinates: [1, 2, 3, 4] },
        ])
      ).toMatchObject([
        {
          coordinates: [1, 2, 3],
          type: 'Point',
        },
        { coordinates: [1, 2, 3, 4], type: 'Shape' },
        { coordinates: [1, 2, 3, 4] },
      ]);
    });

    test('should remove duplicated lon/lat coordinates up to maxExamples', () => {
      expect(
        getUniqGeoOrStrExamples([
          { lon: 0.1, lat: 2343 },
          { lon: 0.1, lat: 2343 },
          { lon: 0.1, lat: 2343 },
          { lon: 0.1, lat: 2343 },
          { lon: 0.1, lat: 2343 },
          { lon: 4321, lat: 2343 },
          { lon: 4321, lat: 2343 },
        ])
      ).toMatchObject([
        { lon: 0.1, lat: 2343 },
        { lon: 4321, lat: 2343 },
      ]);
      expect(
        getUniqGeoOrStrExamples(
          [
            { lon: 1, lat: 2 },
            { lon: 1, lat: 2 },
            { lon: 2, lat: 3 },
            { lon: 2, lat: 3 },
            { lon: 3, lat: 4 },
            { lon: 3, lat: 4 },
            { lon: 4, lat: 5 },
            { lon: 4, lat: 5 },
            { lon: 5, lat: 6 },
            { lon: 5, lat: 6 },
          ],
          3
        )
      ).toMatchObject([
        { lon: 1, lat: 2 },
        { lon: 2, lat: 3 },
        { lon: 3, lat: 4 },
      ]);
    });
  });
});
