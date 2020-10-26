/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setDefaultAutoFitToBounds } from './set_default_auto_fit_to_bounds';

describe('setDefaultAutoFitToBounds', () => {
  test('Should handle missing mapStateJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(setDefaultAutoFitToBounds({ attributes })).toEqual({
      title: 'my map',
    });
  });

  test('Should set default auto fit to bounds when map settings exist in map state', () => {
    const attributes = {
      title: 'my map',
      mapStateJSON: JSON.stringify({
        settings: { showSpatialFilters: false },
      }),
    };
    expect(JSON.parse(setDefaultAutoFitToBounds({ attributes }).mapStateJSON!)).toEqual({
      settings: { autoFitToDataBounds: false, showSpatialFilters: false },
    });
  });

  test('Should set default auto fit to bounds when map settings does not exist in map state', () => {
    const attributes = {
      title: 'my map',
      mapStateJSON: JSON.stringify({}),
    };
    expect(JSON.parse(setDefaultAutoFitToBounds({ attributes }).mapStateJSON!)).toEqual({
      settings: { autoFitToDataBounds: false },
    });
  });
});
