/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { VisTypeDefinition } from '../../../../../../src/plugins/visualizations/public';
import { toExpressionAst } from './to_ast';
import { MapTypes, TileMapVisParams, TILE_MAP_VIS_TYPE } from './types';
import { TileMapEditor } from './tile_map_editor';

export const title = i18n.translate('xpack.maps.tileMap.vis.title', {
  defaultMessage: 'Coordinate Map',
});

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
        editor: TileMapEditor,
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
