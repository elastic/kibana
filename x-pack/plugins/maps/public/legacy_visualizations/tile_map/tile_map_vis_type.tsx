/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import { VisTypeDefinition } from '@kbn/visualizations-plugin/public';
import { toExpressionAst } from './to_ast';
import { MapTypes, TileMapVisParams, TILE_MAP_VIS_TYPE } from './types';
import { LazyWrapper } from '../../lazy_wrapper';

export const title = i18n.translate('xpack.maps.tileMap.vis.title', {
  defaultMessage: 'Coordinate Map',
});

const LazyTileMapEditor = function (props: VisEditorOptionsProps) {
  const getLazyComponent = () => {
    return lazy(() => import('./tile_map_editor'));
  };
  return <LazyWrapper getLazyComponent={getLazyComponent} lazyComponentProps={props} />;
};

export const tileMapVisType = {
  name: TILE_MAP_VIS_TYPE,
  title,
  icon: 'visMapCoordinate',
  description: i18n.translate('xpack.maps.tileMap.vis.description', {
    defaultMessage: 'Plot latitude and longitude coordinates on a map',
  }),
  editorConfig: {
    optionTabs: [
      {
        name: '',
        title: '',
        editor: LazyTileMapEditor,
      },
    ],
  },
  visConfig: {
    defaults: {
      colorSchema: 'Yellow to Red',
      mapType: MapTypes.ScaledCircleMarkers,
      mapZoom: 2,
      mapCenter: [0, 0],
    },
  },
  toExpressionAst,
  requiresSearch: true,
} as VisTypeDefinition<TileMapVisParams>;
