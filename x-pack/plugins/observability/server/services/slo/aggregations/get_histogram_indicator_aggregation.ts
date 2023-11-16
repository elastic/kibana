/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HistogramIndicator } from '@kbn/slo-schema';
import { getElastichsearchQueryOrThrow } from '../transform_generators/common';

type HistogramIndicatorDef =
  | HistogramIndicator['params']['good']
  | HistogramIndicator['params']['total'];

export class GetHistogramIndicatorAggregation {
  constructor(private indicator: HistogramIndicator) {}

  private buildAggregation(type: 'good' | 'total', indicator: HistogramIndicatorDef) {
    const filter = indicator.filter
      ? getElastichsearchQueryOrThrow(indicator.filter)
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

    const range: { from?: number; to?: number } = {};
    if (indicator.from != null) {
      range.from = indicator.from;
    }

    if (indicator.to != null) {
      range.to = indicator.to;
    }

    return {
      filter,
      aggs: {
        total: {
          range: {
            field: indicator.field,
            keyed: true,
            ranges: [range],
          },
        },
      },
    };
  }

  private formatNumberAsFloatString(value: number) {
    return value % 1 === 0 ? `${value}.0` : `${value}`;
  }

  private buildRangeKey(from: number | undefined, to: number | undefined) {
    const fromString = from != null ? this.formatNumberAsFloatString(from) : '*';
    const toString = to != null ? this.formatNumberAsFloatString(to) : '*';
    return `${fromString}-${toString}`;
  }

  private buildBucketScript(type: 'good' | 'total', indicator: HistogramIndicatorDef) {
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
    const rangeKey = this.buildRangeKey(indicator.from, indicator.to);
    return {
      bucket_script: {
        buckets_path: {
          value: `_${type}>total['${rangeKey}']>_count`,
        },
        script: 'params.value',
      },
    };
  }

  public execute({ type, aggregationKey }: { type: 'good' | 'total'; aggregationKey: string }) {
    const indicatorDef = this.indicator.params[type];
    return {
      [`_${type}`]: this.buildAggregation(type, indicatorDef),
      [aggregationKey]: this.buildBucketScript(type, indicatorDef),
    };
  }
}
