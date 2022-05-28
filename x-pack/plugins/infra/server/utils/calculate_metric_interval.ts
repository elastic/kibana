/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP_FIELD } from '../../common/constants';
import { findInventoryModel } from '../../common/inventory_models';
// import { KibanaFramework } from '../lib/adapters/framework/kibana_framework_adapter';
import { InventoryItemType } from '../../common/inventory_models/types';
import { ESSearchClient } from '../lib/metrics/types';

interface Options {
  indexPattern: string;
  timerange: {
    from: number;
    to: number;
  };
}

/**
 * Look at the data from metricbeat and get the max period for a given timerange.
 * This is useful for visualizing metric modules like s3 that only send metrics once per day.
 */
export const calculateMetricInterval = async (
  client: ESSearchClient,
  options: Options,
  modules?: string[],
  nodeType?: InventoryItemType // TODO: check that this type still makes sense
) => {
  let from = options.timerange.from;
  if (nodeType) {
    const inventoryModel = findInventoryModel(nodeType);
    from = options.timerange.to - inventoryModel.metrics.defaultTimeRangeInSeconds * 1000;
  }
  const query = {
    allow_no_indices: true,
    index: options.indexPattern,
    ignore_unavailable: true,
    body: {
      query: {
        bool: {
          filter: [
            {
              range: {
                [TIMESTAMP_FIELD]: {
                  gte: from,
                  lte: options.timerange.to,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      size: 0,
      aggs: {
        modules: {
          terms: {
            field: 'event.dataset',
            include: modules,
          },
          aggs: {
            period: {
              max: {
                field: 'metricset.period',
              },
            },
          },
        },
      },
    },
  };

  const resp = await client<{}, PeriodAggregationData>(query);

  // if ES doesn't return an aggregations key, something went seriously wrong.
  if (!resp.aggregations) {
    return;
  }

  const intervals = resp.aggregations.modules.buckets.map((a) => a.period.value).filter((v) => !!v);
  if (!intervals.length) {
    return;
  }

  return Math.max(...intervals) / 1000;
};

interface PeriodAggregationData {
  modules: {
    buckets: Array<{
      key: string;
      doc_count: number;
      period: {
        value: number;
      };
    }>;
  };
}
