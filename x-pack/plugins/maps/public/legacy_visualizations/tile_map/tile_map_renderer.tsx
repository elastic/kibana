/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { ExpressionRenderDefinition } from 'src/plugins/expressions';
import { TileMapVisRenderValue } from './tile_map_fn';
import { TileMapVisualization } from './tile_map_visualization';

export const tileMapRenderer = {
  name: 'tile_map_vis',
  reuseDomNode: true,
  render: async (domNode, { context, visConfig }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
    });

    render(
      <TileMapVisualization context={context} visConfig={visConfig} />,
      domNode
    );
  },
} as ExpressionRenderDefinition<TileMapVisRenderValue>;