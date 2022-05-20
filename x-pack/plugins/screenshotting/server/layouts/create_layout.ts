/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutParams } from '../../common/layout';
import { LayoutTypes } from '../../common';
import type { Layout } from '.';
import { CanvasLayout } from './canvas_layout';
import { PreserveLayout } from './preserve_layout';
import { PrintLayout } from './print_layout';

/**
 * Layout dimensions must be sanitized as they are passed in the args that spawn the
 * Chromium process. Width and height must be int32 value.
 *
 * We naively round all numeric values in the object, this will break screenshotting
 * if ever a have a non-number set as a value, but this points to an issue
 * in the code responsible for creating the dimensions object.
 */
const sanitizeLayout = (dimensions: { width: number; height: number }) => {
  const { width, height } = dimensions;
  if (isNaN(width) || isNaN(height)) {
    throw new Error(`invalid layout params!`);
  }
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

export function createLayout({ id, dimensions, selectors, ...config }: LayoutParams): Layout {
  if (!id || !Object.values(LayoutTypes).includes(id)) {
    throw new Error(`invalid layout type!`);
  }

  if (dimensions) {
    if (id === LayoutTypes.PRESERVE_LAYOUT) {
      return new PreserveLayout(sanitizeLayout(dimensions), selectors);
    }

    if (id === LayoutTypes.CANVAS) {
      return new CanvasLayout(sanitizeLayout(dimensions));
    }
  }

  // layoutParams is optional as PrintLayout doesn't use it
  return new PrintLayout(config);
}
