/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { Query } from '../../../../../../src/plugins/data/common';
import type { Filter } from '../../../../../../src/plugins/data/common/es_query';
import type { TimeRange } from '../../../../../../src/plugins/data/common/query/timefilter/types';
import type { ExpressionValueSearchContext } from '../../../../../../src/plugins/data/common/search/expressions/kibana_context_type';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common/expression_functions/types';
import type { ExpressionValueRender as Render } from '../../../../../../src/plugins/expressions/common/expression_types/specs/render';
import type { TileMapVisConfig } from './types';
import { TILE_MAP_RENDER, TILE_MAP_VIS_TYPE } from './types';

interface Arguments {
  visConfig: string;
}

export interface TileMapVisRenderValue {
  visType: typeof TILE_MAP_VIS_TYPE;
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
      as: TILE_MAP_RENDER,
      value: {
        visType: TILE_MAP_VIS_TYPE,
        visConfig: JSON.parse(args.visConfig),
        filters: input.filters,
        query: Array.isArray(input.query) ? input.query[0] : input.query,
        timeRange: input.timeRange,
      },
    };
  },
});
