/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { findInventoryModel, findInventoryFields } from '../../../common/inventory_models/index';
import { InfraSnapshotRequestOptions } from './types';
import { getIntervalInSeconds } from '../../utils/get_interval_in_seconds';
import {
  SnapshotModelRT,
  SnapshotModel,
  InventoryItemType,
} from '../../../common/inventory_models/types';
import {
  SnapshotMetricInput,
  SnapshotCustomMetricInputRT,
} from '../../../common/http_api/snapshot_api';
import { networkTraffic } from '../../../common/inventory_models/shared/metrics/snapshot/network_traffic';

interface GroupBySource {
  [id: string]: {
    terms: {
      field: string | null | undefined;
      missing_bucket?: boolean;
    };
  };
}

export const getFieldByNodeType = (options: InfraSnapshotRequestOptions) => {
  const inventoryFields = findInventoryFields(options.nodeType, options.sourceConfiguration.fields);
  return inventoryFields.id;
};

export const getGroupedNodesSources = (options: InfraSnapshotRequestOptions) => {
  const fields = findInventoryFields(options.nodeType, options.sourceConfiguration.fields);
  const sources: GroupBySource[] = options.groupBy.map((gb) => {
    return { [`${gb.field}`]: { terms: { field: gb.field } } };
  });
  sources.push({
    id: {
      terms: { field: fields.id },
    },
  });
  sources.push({
    name: { terms: { field: fields.name, missing_bucket: true } },
  });
  return sources;
};

export const getMetricsSources = (options: InfraSnapshotRequestOptions) => {
  const fields = findInventoryFields(options.nodeType, options.sourceConfiguration.fields);
  return [{ id: { terms: { field: fields.id } } }];
};

export const metricToAggregation = (
  nodeType: InventoryItemType,
  metric: SnapshotMetricInput,
  index: number
) => {
  const inventoryModel = findInventoryModel(nodeType);
  if (SnapshotCustomMetricInputRT.is(metric)) {
    if (metric.aggregation === 'rate') {
      return networkTraffic(`custom_${index}`, metric.field);
    }
    return {
      [`custom_${index}`]: {
        [metric.aggregation]: {
          field: metric.field,
        },
      },
    };
  }
  return inventoryModel.metrics.snapshot?.[metric.type];
};

export const getMetricsAggregations = (options: InfraSnapshotRequestOptions): SnapshotModel => {
  const { metrics } = options;
  return metrics.reduce((aggs, metric, index) => {
    const aggregation = metricToAggregation(options.nodeType, metric, index);
    if (!SnapshotModelRT.is(aggregation)) {
      throw new Error(
        i18n.translate('xpack.infra.snapshot.missingSnapshotMetricError', {
          defaultMessage: 'The aggregation for {metric} for {nodeType} is not available.',
          values: {
            nodeType: options.nodeType,
            metric: metric.type,
          },
        })
      );
    }
    return { ...aggs, ...aggregation };
  }, {});
};

export const getDateHistogramOffset = (from: number, interval: string): string => {
  const fromInSeconds = Math.floor(from / 1000);
  const bucketSizeInSeconds = getIntervalInSeconds(interval);

  // negative offset to align buckets with full intervals (e.g. minutes)
  const offset = (fromInSeconds % bucketSizeInSeconds) - bucketSizeInSeconds;
  return `${offset}s`;
};
