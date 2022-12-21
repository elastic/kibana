/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidLayoutParametersError } from '../../common/errors';
import type { LayoutParams, LayoutType } from '../../common/layout';
import type { Layout } from '.';
import { CanvasLayout } from './canvas_layout';
import { PreserveLayout } from './preserve_layout';
import { PrintLayout } from './print_layout';

// utility for validating the layout type from user's job params
const LAYOUTS: LayoutType[] = ['canvas', 'print', 'preserve_layout'];

/**
 * Layout dimensions must be sanitized as they are passed in the args that spawn the
 * Chromium process. Width and height must be int32 value.
 *
 */
const sanitizeLayout = (dimensions: { width: number; height: number }) => {
  const { width, height } = dimensions;
  if (isNaN(width) || isNaN(height)) {
    throw new InvalidLayoutParametersError(`Invalid layout width or height`);
  }
  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

export function createLayout({ id, dimensions, selectors, ...config }: LayoutParams): Layout {
  const layoutId = id ?? 'print';

  if (!LAYOUTS.includes(layoutId)) {
    throw new InvalidLayoutParametersError(`Invalid layout type`);
  }

  if (dimensions) {
    if (layoutId === 'preserve_layout') {
      return new PreserveLayout(sanitizeLayout(dimensions), selectors);
    }

    if (layoutId === 'canvas') {
      return new CanvasLayout(sanitizeLayout(dimensions));
    }
  }

  // layoutParams is optional as PrintLayout doesn't use it
  return new PrintLayout(config);
}
