/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import type { Query, TimeRange } from '../../../../../../src/plugins/data/common';
import type { ExpressionValueSearchContext } from '../../../../../../src/plugins/data/common/search/expressions/kibana_context_type';
import type {
  ExpressionFunctionDefinition,
  Render,
} from '../../../../../../src/plugins/expressions/public';
import { REGION_MAP_RENDER, REGION_MAP_VIS_TYPE, RegionMapVisConfig } from './types';

interface Arguments {
  visConfig: string;
}

export interface RegionMapVisRenderValue {
  visType: typeof REGION_MAP_VIS_TYPE;
  visConfig: RegionMapVisConfig;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
}

export type RegionMapExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'regionmap',
  ExpressionValueSearchContext,
  Arguments,
  Promise<Render<RegionMapVisRenderValue>>
>;

export const createRegionMapFn = (): RegionMapExpressionFunctionDefinition => ({
  name: 'regionmap',
  type: 'render',
  help: i18n.translate('xpack.maps.regionMap.function.help', {
    defaultMessage: 'Regionmap visualization',
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
      as: REGION_MAP_RENDER,
      value: {
        visType: REGION_MAP_VIS_TYPE,
        visConfig: JSON.parse(args.visConfig),
        filters: input.filters,
        query: Array.isArray(input.query) ? input.query[0] : input.query,
        timeRange: input.timeRange,
      },
    };
  },
});
