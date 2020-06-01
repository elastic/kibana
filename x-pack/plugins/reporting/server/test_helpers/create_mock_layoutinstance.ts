/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaptureConfig } from '../../server/types';
import { createLayout, LayoutInstance, LayoutTypes } from '../export_types/common/layouts';

export const createMockLayoutInstance = (captureConfig: CaptureConfig) => {
  const mockLayout = createLayout(captureConfig, {
    id: LayoutTypes.PRESERVE_LAYOUT,
    dimensions: { height: 100, width: 100 },
  }) as LayoutInstance;
  mockLayout.selectors = {
    renderComplete: 'renderedSelector',
    itemsCountAttribute: 'itemsSelector',
    screenshot: 'screenshotSelector',
    timefilterDurationAttribute: 'timefilterDurationSelector',
  };
  return mockLayout;
};
