/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { ISearchClient } from '@kbn/data-plugin/common';
import { ESSearchRequest } from '@kbn/es-types';
import { catchError, map, Observable } from 'rxjs';
import { findInventoryModel } from '../../../../../common/inventory_models';
import {
  GetInfraMetricsRequestBodyPayload,
  InfraAssetMetricType,
} from '../../../../../common/http_api/infra';
import { INVENTORY_MODEL_NODE_TYPE } from '../constants';

export const createFilters = ({
  params,
  extraFilter,
  hostNamesShortList = [],
}: {
  params: GetInfraMetricsRequestBodyPayload;
  hostNamesShortList?: string[];
  extraFilter?: estypes.QueryDslQueryContainer;
}) => {
  const extrafilterClause = extraFilter?.bool?.filter;
  const extraFilterList = !!extrafilterClause
    ? Array.isArray(extrafilterClause)
      ? extrafilterClause
      : [extrafilterClause]
    : [];

  const hostNamesFilter =
    hostNamesShortList.length > 0
      ? [
          {
            terms: {
              'host.name': hostNamesShortList,
            },
          },
        ]
      : [];

  return [
    ...hostNamesFilter,
    ...extraFilterList,
    {
      range: {
        '@timestamp': {
          gte: new Date(params.range.from).getTime(),
          lte: new Date(params.range.to).getTime(),
          format: 'epoch_millis',
        },
      },
    },
    {
      exists: {
        field: 'host.name',
      },
    },
  ];
};

export const runQuery = <T>(
  serchClient: ISearchClient,
  queryRequest: ESSearchRequest,
  decoder: (aggregation: Record<string, estypes.AggregationsAggregate> | undefined) => T | undefined
): Observable<T | undefined> => {
  return serchClient
    .search({
      params: queryRequest,
    })
    .pipe(
      map((res) => decoder(res.rawResponse.aggregations)),
      catchError((err) => {
        const error = {
          message: err.message,
          statusCode: err.statusCode,
          attributes: err.errBody?.error,
        };

        throw error;
      })
    );
};

export const getInventoryModelAggregations = (
  metrics: InfraAssetMetricType[]
): Record<string, estypes.AggregationsAggregationContainer> => {
  const inventoryModel = findInventoryModel(INVENTORY_MODEL_NODE_TYPE);
  return metrics.reduce(
    (acc, metric) => Object.assign(acc, inventoryModel.metrics.snapshot?.[metric]),
    {}
  );
};
