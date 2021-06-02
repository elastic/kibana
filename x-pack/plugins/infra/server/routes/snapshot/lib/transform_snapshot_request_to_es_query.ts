/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { estypes } from '@elastic/elasticsearch';
import { findInventoryFields, findInventoryModel } from '../../../../common/inventory_models';
import { parseFilterQuery } from '../../../utils/serialized_query';
import { ESSearchClient } from '../../../lib/metrics/types';
import { InfraSource } from '../../../lib/sources';
import { SourceOverrides } from './get_nodes';
import { SnapshotCustomMetricInputRT, SnapshotRequest } from '../../../../common/http_api';
import { createTimeRangeWithInterval } from './create_timerange_with_interval';
import { calculateDateHistogramOffset } from '../../../lib/metrics/lib/calculate_date_histogram_offset';
import { META_KEY } from './constants';

export const transformSnapshotRequestToESQuery = async ({
  client,
  source,
  snapshotRequest,
  compositeSize,
  sourceOverrides,
}: {
  client: ESSearchClient;
  source: InfraSource;
  snapshotRequest: SnapshotRequest;
  compositeSize: number;
  sourceOverrides?: SourceOverrides;
}): Promise<estypes.SearchRequest> => {
  const timeRangeWithIntervalApplied = await createTimeRangeWithInterval(client, {
    ...snapshotRequest,
    filterQuery: parseFilterQuery(snapshotRequest.filterQuery),
    sourceConfiguration: source.configuration,
  });

  const timestampField = sourceOverrides?.timestamp ?? source.configuration.fields.timestamp;
  const filters: estypes.QueryContainer[] = [
    {
      range: {
        [timestampField]: {
          gte: timeRangeWithIntervalApplied.from,
          lte: timeRangeWithIntervalApplied.to,
          format: 'epoch_millis',
        },
      },
    },
  ];

  const parsedFilters = parseFilterQuery(snapshotRequest.filterQuery);
  if (parsedFilters) {
    filters.push(parsedFilters);
  }

  if (snapshotRequest.accountId) {
    filters.push({ term: { 'cloud.account.id': snapshotRequest.accountId } });
  }

  if (snapshotRequest.region) {
    filters.push({ term: { 'cloud.region': snapshotRequest.region } });
  }

  const inventoryModel = findInventoryModel(snapshotRequest.nodeType);
  if (inventoryModel && inventoryModel.nodeFilter) {
    inventoryModel.nodeFilter?.forEach((f) => filters.push(f));
  }

  const inventoryFields = findInventoryFields(
    snapshotRequest.nodeType,
    source.configuration.fields
  );

  const metricAggs: Record<string, estypes.AggregationContainer> = snapshotRequest.metrics.reduce(
    (aggregations, metric, index) => {
      if (SnapshotCustomMetricInputRT.is(metric)) {
        if (metric.aggregation === 'rate') {
          return {
            ...aggregations,
            [`custom_${index}`]: {
              max: {
                field: metric.field,
              },
            },
          };
        }
        return {
          ...aggregations,
          ['custom_${index}']: {
            [metric.aggregation]: {
              field: metric.field,
            },
          },
        };
      }
      return { ...aggregations, ...inventoryModel.metrics.snapshot[metric.type].aggs };
    },
    {}
  );

  const metadataFields = [{ field: inventoryFields.name }];

  if (inventoryFields.ip) {
    metadataFields.push({ field: inventoryFields.ip });
  }

  metricAggs[META_KEY] = {
    top_metrics: {
      size: 1,
      metrics: metadataFields,
      sort: { [timestampField]: 'desc' },
    },
  };

  const sources: Array<Record<string, estypes.CompositeAggregationSource>> = [
    {
      timeseries: {
        date_histogram: {
          field: timestampField,
          fixed_interval: timeRangeWithIntervalApplied.interval,
          offset: calculateDateHistogramOffset({
            to: timeRangeWithIntervalApplied.to,
            from: timeRangeWithIntervalApplied.from,
            interval: timeRangeWithIntervalApplied.interval,
            field: timestampField,
          }),
        },
      },
    },
    { node: { terms: { field: inventoryFields.id } } },
  ];

  if (snapshotRequest.groupBy) {
    snapshotRequest.groupBy.map((groupBy, index) => {
      if (groupBy != null && groupBy.field) {
        sources.push({ [`group_${index}`]: { terms: { field: groupBy.field } } });
      }
    });
  }
  const topLevelAgg = {
    nodes: {
      composite: {
        sources,
        size: snapshotRequest.overrideCompositeSize
          ? snapshotRequest.overrideCompositeSize
          : compositeSize,
      },
      aggs: metricAggs,
    },
  };

  const request: estypes.SearchRequest = {
    index: sourceOverrides?.indexPattern ?? source.configuration.metricAlias,
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: topLevelAgg,
    },
  };
  return request;
};
