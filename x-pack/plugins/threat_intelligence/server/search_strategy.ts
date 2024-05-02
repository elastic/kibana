/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENHANCED_ES_SEARCH_STRATEGY,
  IEsSearchRequest,
  ISearchRequestParams,
} from '@kbn/data-plugin/common';
import { ISearchStrategy, PluginStart, shimHitsTotal } from '@kbn/data-plugin/server';
import { map } from 'rxjs';
import { BARCHART_AGGREGATION_NAME, FactoryQueryType } from '../common/constants';
import { RawIndicatorFieldId } from '../common/types/indicator';
import { calculateBarchartColumnTimeInterval } from './utils/calculate_barchart_time_interval';
import { createRuntimeMappings } from './utils/get_indicator_query_params';

const TIMESTAMP_FIELD = RawIndicatorFieldId.TimeStamp;

function isObj(req: unknown): req is Record<string, unknown> {
  return typeof req === 'object' && req !== null;
}

function assertValidRequestType(req: unknown): asserts req is Record<string, {}> {
  if (!isObj(req) || req.factoryQueryType == null) {
    throw new Error('factoryQueryType is required');
  }
}

type BarchartAggregationRequest = IEsSearchRequest & {
  dateRange: {
    from: number;
    to: number;
  };
  field: string;
};

function isBarchartRequest(req: unknown): req is BarchartAggregationRequest {
  return isObj(req) && req.factoryQueryType === FactoryQueryType.Barchart;
}

const getAggregationsQuery = (request: BarchartAggregationRequest) => {
  const {
    dateRange: { from: min, to: max },
    field,
  } = request;

  const interval = calculateBarchartColumnTimeInterval(min, max);

  return {
    aggregations: {
      [BARCHART_AGGREGATION_NAME]: {
        terms: {
          field,
        },
        aggs: {
          events: {
            date_histogram: {
              field: TIMESTAMP_FIELD,
              fixed_interval: interval,
              min_doc_count: 0,
              extended_bounds: {
                min,
                max,
              },
            },
          },
        },
      },
    },
    fields: [TIMESTAMP_FIELD, field],
    size: 0,
  };
};

export const threatIntelligenceSearchStrategyProvider = (data: PluginStart): ISearchStrategy => {
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

  return {
    search: (request, options, deps) => {
      assertValidRequestType(request);

      const runtimeMappings = createRuntimeMappings();

      const dsl = {
        ...request.params,
        runtime_mappings: runtimeMappings,
        ...(isBarchartRequest(request) ? getAggregationsQuery(request) : {}),
      } as unknown as ISearchRequestParams;

      return es.search({ ...request, params: dsl }, options, deps).pipe(
        map((response) => {
          return {
            ...response,
            ...{
              rawResponse: shimHitsTotal(response.rawResponse, options),
            },
          };
        })
      );
    },
    cancel: async (id, options, deps) => {
      if (es.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
