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
import { BUCKET_KEY } from '../constants';

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

  return [
    ...extraFilterList,
    ...termsQuery(BUCKET_KEY, ...hostNamesShortList),
    ...rangeQuery(new Date(params.range.from).getTime(), new Date(params.range.to).getTime()),
    {
      exists: {
        field: BUCKET_KEY,
      },
    },
  ];
};

export const getInventoryModelAggregations = (
  assetType: 'host',
  metrics: InfraAssetMetricType[]
) => {
  const inventoryModel = findInventoryModel(assetType);
  return metrics.reduce<
    Partial<
      Record<
        InfraAssetMetricType,
        typeof inventoryModel.metrics.snapshot[keyof typeof inventoryModel.metrics.snapshot]
      >
    >
  >(
    (acc, metric) =>
      inventoryModel.metrics.snapshot?.[metric]
        ? Object.assign(acc, inventoryModel.metrics.snapshot[metric])
        : acc,
    {}
  );
};
