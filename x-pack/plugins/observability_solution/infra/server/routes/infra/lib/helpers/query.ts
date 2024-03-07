/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { termsQuery, rangeQuery } from '@kbn/observability-plugin/server';
import {
  GetInfraMetricsRequestBodyPayload,
  InfraAssetMetricType,
} from '../../../../../common/http_api/infra';

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
    hostNamesShortList.length > 0 ? termsQuery('host.name', ...hostNamesShortList) : [];

  return [
    ...hostNamesFilter,
    ...extraFilterList,
    ...rangeQuery(new Date(params.range.from).getTime(), new Date(params.range.to).getTime()),
    {
      exists: {
        field: 'host.name',
      },
    },
  ];
};

export const systemMetricsFilter = {
  must: [
    {
      bool: {
        should: [
          {
            term: {
              'event.module': 'system',
            },
          },
          {
            term: {
              'metricset.module': 'system', // Needed for hosts where metricbeat version < 8
            },
          },
        ],
      },
    },
  ],
};

export const getInventoryModelAggregations = (
  assetType: 'host',
  metrics: InfraAssetMetricType[]
) => {
  const inventoryModel = findInventoryModel(assetType);
  return metrics.reduce(
    (acc, metric) => Object.assign(acc, inventoryModel.metrics.snapshot?.[metric]),
    {} as {
      [key in InfraAssetMetricType]: NonNullable<typeof inventoryModel.metrics.snapshot[key]>;
    }
  );
};
