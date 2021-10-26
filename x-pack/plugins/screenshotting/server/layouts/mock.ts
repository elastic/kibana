/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLayout, LayoutTypes, LayoutInstance } from '.';

export function createMockLayoutInstance(): LayoutInstance {
  const layout = createLayout(
    { zoom: 1 },
    {
      id: LayoutTypes.PRESERVE_LAYOUT,
      dimensions: { height: 100, width: 100 },
    }
  ) as LayoutInstance;

  layout.selectors = {
    renderComplete: 'renderedSelector',
    itemsCountAttribute: 'itemsSelector',
    screenshot: 'screenshotSelector',
    renderError: '[dataRenderErrorSelector]',
    renderErrorAttribute: 'dataRenderErrorSelector',
    timefilterDurationAttribute: 'timefilterDurationSelector',
  };

  return layout;
}
