/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { ExpressionRenderDefinition } from 'src/plugins/expressions';
import { TileMapVisRenderValue } from './tile_map_fn';
import { TileMapVisualization } from './tile_map_visualization';

export const tileMapRenderer = {
  name: 'tile_map_vis',
  reuseDomNode: true,
  render: async (domNode, { filters, query, timeRange, visConfig }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <TileMapVisualization
        onInitialRenderComplete={() => {
          handlers.done();
        }}
        filters={filters}
        query={query}
        timeRange={timeRange}
        visConfig={visConfig}
      />,
      domNode
    );
  },
} as ExpressionRenderDefinition<TileMapVisRenderValue>;
