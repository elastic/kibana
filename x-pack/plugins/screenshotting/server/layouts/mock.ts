/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayoutTypes } from '../../common';
import { createLayout, Layout } from '.';

export function createMockLayout(): Layout {
  const layout = createLayout({
    id: LayoutTypes.PRESERVE_LAYOUT,
    dimensions: { height: 100, width: 100 },
    zoom: 1,
  }) as Layout;

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
