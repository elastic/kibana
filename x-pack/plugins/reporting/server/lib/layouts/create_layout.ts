/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LAYOUT_TYPES } from '../../../common/constants';
import { CaptureConfig } from '../../types';
import { LayoutInstance, LayoutParams, LayoutTypes } from './';
import { CanvasLayout } from './canvas_layout';
import { PreserveLayout } from './preserve_layout';
import { PrintLayout } from './print_layout';

export function createLayout(
  captureConfig: CaptureConfig,
  layoutParams?: LayoutParams
): LayoutInstance {
  if (layoutParams && layoutParams.dimensions && layoutParams.id === LAYOUT_TYPES.PRESERVE_LAYOUT) {
    return new PreserveLayout(layoutParams.dimensions);
  }

  if (layoutParams && layoutParams.dimensions && layoutParams.id === LayoutTypes.CANVAS) {
    return new CanvasLayout(layoutParams.dimensions);
  }

  // layoutParams is optional as PrintLayout doesn't use it
  return new PrintLayout(captureConfig);
}
