/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common';
import { dynamic } from '@kbn/shared-ux-utility';
import type { RegionMapVisRenderValue } from './region_map_fn';
import { REGION_MAP_RENDER } from './types';

const Component = dynamic(async () => {
  const { RegionMapVisualization } = await import('./region_map_visualization');
  return {
    default: RegionMapVisualization,
  };
});

export const regionMapRenderer = {
  name: REGION_MAP_RENDER,
  reuseDomNode: true,
  render: async (domNode, { filters, query, timeRange, visConfig }, handlers) => {
    const root = createRoot(domNode);

    handlers.onDestroy(() => {
      root.unmount();
    });

    const props = {
      onInitialRenderComplete: () => {
        handlers.done();
      },
      filters,
      query,
      timeRange,
      visConfig,
    };

    root.render(<Component {...props} />);
  },
} as ExpressionRenderDefinition<RegionMapVisRenderValue>;
