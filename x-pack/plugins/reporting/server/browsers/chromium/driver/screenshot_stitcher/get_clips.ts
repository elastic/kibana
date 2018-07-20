/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { Rectangle } from './types';

/**
 * Takes one large rectangle and breaks it down into an array of smaller rectangles,
 * that if stitched together would create the original rectangle.
 * @param largeRectangle - A big rectangle that might be broken down into smaller rectangles
 * @param max - Maximum width or height any single clip should have
 */
export function $getClips(largeRectangle: Rectangle, max: number): Rx.Observable<Rectangle> {
  const rectanglesGenerator = function*(): IterableIterator<Rectangle> {
    const columns = Math.ceil(largeRectangle.width / max) || 1;
    const rows = Math.ceil(largeRectangle.height / max) || 1;

    for (let row = 0; row < rows; ++row) {
      for (let column = 0; column < columns; ++column) {
        yield {
          height: row === rows - 1 ? largeRectangle.height - row * max : max,
          width: column === columns - 1 ? largeRectangle.width - column * max : max,
          x: column * max + largeRectangle.x,
          y: row * max + largeRectangle.y,
        };
      }
    }
  };

  return Rx.from(rectanglesGenerator());
}
