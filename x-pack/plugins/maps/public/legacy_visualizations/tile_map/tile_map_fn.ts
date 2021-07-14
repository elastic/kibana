/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Filter, Query, TimeRange } from '../../../../../../src/plugins/data/common';
import type { ExpressionValueSearchContext } from '../../../../../../src/plugins/data/common/search/expressions/kibana_context_type';
import type {
  ExpressionFunctionDefinition,
  Render,
} from '../../../../../../src/plugins/expressions/public';
import { TileMapVisConfig } from './types';

interface Arguments {
  visConfig: string;
}

export interface TileMapVisRenderValue {
  visType: 'tile_map';
  visConfig: TileMapVisConfig;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
}

export type TileMapExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'tilemap',
  ExpressionValueSearchContext,
  Arguments,
  Promise<Render<TileMapVisRenderValue>>
>;

export const createTileMapFn = (): TileMapExpressionFunctionDefinition => ({
  name: 'tilemap',
  type: 'render',
  help: i18n.translate('xpack.maps.tileMap.function.help', {
    defaultMessage: 'Tilemap visualization',
  }),
  args: {
    visConfig: {
      types: ['string'],
      default: '"{}"',
      help: '',
    },
  },
  async fn(input, args) {
    return {
      type: 'render',
      as: 'tile_map_vis',
      value: {
        visType: 'tile_map',
        visConfig: JSON.parse(args.visConfig),
        filters: input.filters,
        query: Array.isArray(input.query) ? input.query[0] : input.query,
        timeRange: input.timeRange,
      },
    };
  },
});
