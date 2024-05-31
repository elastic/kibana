/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HistogramIndicator } from '@kbn/slo-schema';
import { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getElasticsearchQueryOrThrow } from '../transform_generators/common';

type HistogramIndicatorDef =
  | HistogramIndicator['params']['good']
  | HistogramIndicator['params']['total'];

export class GetHistogramIndicatorAggregation {
  constructor(private indicator: HistogramIndicator) {}

  private buildAggregation(indicator: HistogramIndicatorDef): AggregationsAggregationContainer {
    const filter = indicator.filter
      ? getElasticsearchQueryOrThrow(indicator.filter)
      : { match_all: {} };
    if (indicator.aggregation === 'value_count') {
      return {
        filter,
        aggs: {
          total: {
            value_count: { field: indicator.field },
          },
        },
      };
    }

    if (indicator.aggregation === 'range' && (indicator.from == null || indicator.to == null)) {
      throw new Error('Invalid Range: both "from" or "to" are required for a range aggregation.');
    }

    if (
      indicator.aggregation === 'range' &&
      indicator.from != null &&
      indicator.to != null &&
      indicator.from >= indicator.to
    ) {
      throw new Error('Invalid Range: "from" should be less that "to".');
    }

    return {
      filter,
      aggs: {
        total: {
          range: {
            field: indicator.field,
            keyed: true,
            ranges: [
              {
                key: 'target',
                from: indicator.from,
                to: indicator.to,
              },
            ],
          },
        },
      },
    };
  }

  private buildBucketScript(
    type: 'good' | 'total',
    indicator: HistogramIndicatorDef
  ): AggregationsAggregationContainer {
    if (indicator.aggregation === 'value_count') {
      return {
        bucket_script: {
          buckets_path: {
            value: `_${type}>total`,
          },
          script: 'params.value',
        },
      };
    }
    return {
      bucket_script: {
        buckets_path: {
          value: `_${type}>total['target']>_count`,
        },
        script: 'params.value',
      },
    };
  }

  public execute({ type, aggregationKey }: { type: 'good' | 'total'; aggregationKey: string }) {
    const indicatorDef = this.indicator.params[type];
    return {
      [`_${type}`]: this.buildAggregation(indicatorDef),
      [aggregationKey]: this.buildBucketScript(type, indicatorDef),
    };
  }
}
