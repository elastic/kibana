/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition, Datatable, Render } from '../../../../../../src/plugins/expressions/public';
import { TileMapVisConfig } from './types';

interface Arguments {
  visConfig: string;
}

export interface TileMapVisRenderValue {
  visType: 'tile_map';
  visConfig: TileMapVisConfig;
}

export type TileMapExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'tilemap',
  Datatable,
  Arguments,
  Promise<Render<TileMapVisRenderValue>>
>;

export const createTileMapFn = (): TileMapExpressionFunctionDefinition => ({
  name: 'tilemap',
  type: 'render',
  help: i18n.translate('tileMap.function.help', {
    defaultMessage: 'Tilemap visualization',
  }),
  args: {
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
      help: '',
    },
  },
  async fn(context, args) {
    return {
      type: 'render',
      as: 'tile_map_vis',
      value: {
        visType: 'tile_map',
        visConfig: JSON.parse(args.visConfig),
        context,
      },
    };
  },
});