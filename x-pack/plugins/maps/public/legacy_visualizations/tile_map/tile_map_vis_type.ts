/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { VisTypeDefinition } from '../../../../../../src/plugins/visualizations/public';
import { toExpressionAst } from './to_ast';
import { MapTypes, TileMapVisParams } from './types';
import { TileMapEditor } from './tile_map_editor';

export const tileMapVisType = {
  name: 'tile_map',
  title: i18n.translate('tileMap.vis.mapTitle', {
    defaultMessage: 'Coordinate Map',
  }),
  icon: 'visMapCoordinate',
  description: i18n.translate('tileMap.vis.mapDescription', {
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
    },
  },
  toExpressionAst,
  requiresSearch: true,
} as VisTypeDefinition<TileMapVisParams>;
