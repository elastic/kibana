/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { ExpressionRenderDefinition } from '@kbn/expressions-plugin/common';
import { dynamic } from '@kbn/shared-ux-utility';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { TileMapVisRenderValue } from './tile_map_fn';
import { TILE_MAP_RENDER } from './types';
import { getAnalytics, getCoreI18n, getTheme } from '../../kibana_services';

const Component = dynamic(async () => {
  const { TileMapVisualization } = await import('./tile_map_visualization');
  return {
    default: TileMapVisualization,
  };
});

export const tileMapRenderer = {
  name: TILE_MAP_RENDER,
  reuseDomNode: true,
  render: async (domNode, { filters, query, timeRange, visConfig }, handlers) => {
    handlers.onDestroy(() => {
      unmountComponentAtNode(domNode);
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

    render(
      <KibanaRenderContextProvider
        analytics={getAnalytics()}
        i18n={getCoreI18n()}
        theme={getTheme()}
      >
        <Component {...props} />
      </KibanaRenderContextProvider>,
      domNode
    );
  },
} as ExpressionRenderDefinition<TileMapVisRenderValue>;
