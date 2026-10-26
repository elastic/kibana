/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeStageFit } from './stage_fit';

describe('computeStageFit', () => {
  it('scales a wide viewport down to the container width and centres it vertically', () => {
    expect(
      computeStageFit({
        container: { width: 400, height: 400 },
        viewport: { width: 800, height: 400 },
      })
    ).toEqual({ scale: 0.5, offsetX: 0, offsetY: 100 });
  });

  it('scales a tall viewport down to the container height and centres it horizontally', () => {
    expect(
      computeStageFit({
        container: { width: 400, height: 200 },
        viewport: { width: 400, height: 400 },
      })
    ).toEqual({ scale: 0.5, offsetX: 100, offsetY: 0 });
  });

  it('never scales up', () => {
    expect(
      computeStageFit({
        container: { width: 1_000, height: 1_000 },
        viewport: { width: 500, height: 500 },
      })
    ).toEqual({ scale: 1, offsetX: 250, offsetY: 250 });
  });

  it.each([
    ['a zero container', { width: 0, height: 100 }, { width: 100, height: 100 }],
    ['a zero viewport', { width: 100, height: 100 }, { width: 0, height: 100 }],
    ['a negative container', { width: -1, height: 100 }, { width: 100, height: 100 }],
    ['a non-finite viewport', { width: 100, height: 100 }, { width: Number.NaN, height: 100 }],
  ])('returns a neutral fit for %s', (_name, container, viewport) => {
    expect(computeStageFit({ container, viewport })).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });
});
