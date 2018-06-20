/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { Dimension } from './types';

/**
 * Takes one large dimension and breaks it down into an array of smaller dimensions,
 * that if stitched together would create a final image with the size of the original dimension.
 * @param dimensions - Final size all clips combined should create.
 * @param max - Maximum width or height any single clip should have
 */
export function $getClips(
  dimensions: Dimension,
  max: number
): Rx.Observable<Dimension> {
  const dimensionsGenerator = function*(): IterableIterator<Dimension> {
    const columns = Math.ceil(dimensions.width / max) || 1;
    const rows = Math.ceil(dimensions.height / max) || 1;

    for (let row = 0; row < rows; ++row) {
      for (let column = 0; column < columns; ++column) {
        yield {
          height: row === rows - 1 ? dimensions.height - row * max : max,
          width: column === columns - 1 ? dimensions.width - column * max : max,
          x: column * max + dimensions.x,
          y: row * max + dimensions.y,
        };
      }
    }
  };

  return Rx.from(dimensionsGenerator());
}
