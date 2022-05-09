/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map as mapRecord } from 'fp-ts/lib/Record';
import type { LayoutParams } from '../../common/layout';
import { LayoutTypes } from '../../common';
import type { Layout } from '.';
import { CanvasLayout } from './canvas_layout';
import { PreserveLayout } from './preserve_layout';
import { PrintLayout } from './print_layout';

/**
 * We naively round all numeric values in the object, this will break screenshotting
 * if ever a have a non-number set as a value, but this points to an issue
 * in the code responsible for creating the dimensions object.
 */
const roundNumbers = mapRecord(Math.round);

export function createLayout({ id, dimensions, selectors, ...config }: LayoutParams): Layout {
  if (dimensions && id === LayoutTypes.PRESERVE_LAYOUT) {
    return new PreserveLayout(roundNumbers(dimensions), selectors);
  }

  if (dimensions && id === LayoutTypes.CANVAS) {
    return new CanvasLayout(roundNumbers(dimensions));
  }

  // layoutParams is optional as PrintLayout doesn't use it
  return new PrintLayout(config);
}
