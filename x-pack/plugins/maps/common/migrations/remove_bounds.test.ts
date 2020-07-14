/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { removeBoundsFromSavedObject } from './remove_bounds';

describe('removeBoundsFromSavedObject', () => {
  test('Remove when present', () => {
    const attributes = {
      title: 'my map',
      bounds: {
        type: 'polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    };
    expect(removeBoundsFromSavedObject({ attributes })).toEqual({
      title: 'my map',
    });
  });

  test('No-op when absent', () => {
    const attributes = {
      title: 'my map',
    };
    expect(removeBoundsFromSavedObject({ attributes })).toEqual({
      title: 'my map',
    });
  });
});
