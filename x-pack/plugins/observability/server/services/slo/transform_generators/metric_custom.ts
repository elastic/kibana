/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { metricCustomIndicatorSchema, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';

import { InvalidTransformError } from '../../../errors';
import { getSLOTransformTemplate } from '../../../assets/transform_templates/slo_transform_template';
import { getElastichsearchQueryOrThrow, TransformGenerator } from '.';
import {
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
  getSLOTransformId,
} from '../../../assets/constants';
import { MetricCustomIndicator, SLO } from '../../../domain/models';

type MetricCustomMetricDef =
  | MetricCustomIndicator['params']['good']
  | MetricCustomIndicator['params']['total'];

export const INVALID_EQUATION_REGEX = /[^A-Z|+|\-|\s|\d+|\.|\(|\)|\/|\*|>|<|=|\?|\:|&|\!|\|]+/g;

export class MetricCustomTransformGenerator extends TransformGenerator {
  public getTransformParams(slo: SLO): TransformPutTransformRequest {
    if (!metricCustomIndicatorSchema.is(slo.indicator)) {
      throw new InvalidTransformError(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildDescription(slo),
      this.buildSource(slo, slo.indicator),
      this.buildDestination(),
      this.buildGroupBy(slo, slo.indicator.params.timestampField),
      this.buildAggregations(slo, slo.indicator),
      this.buildSettings(slo, slo.indicator.params.timestampField)
    );
  }

  private buildTransformId(slo: SLO): string {
    return getSLOTransformId(slo.id, slo.revision);
  }

  private buildSource(slo: SLO, indicator: MetricCustomIndicator) {
    const filter = getElastichsearchQueryOrThrow(indicator.params.filter);
    return {
      index: indicator.params.index,
      runtime_mappings: this.buildCommonRuntimeMappings(slo),
      query: filter,
    };
  }

  private buildDestination() {
    return {
      pipeline: SLO_INGEST_PIPELINE_NAME,
      index: SLO_DESTINATION_INDEX_NAME,
    };
  }

  private buildMetricAggregations(type: 'good' | 'total', metricDef: MetricCustomMetricDef) {
    return metricDef.metrics.reduce(
      (acc, metric) => ({
        ...acc,
        [`_${type}_${metric.name}`]: {
          [metric.aggregation]: { field: metric.field },
        },
      }),
      {}
    );
  }

  private convertEquationToPainless(bucketsPath: Record<string, string>, equation: string) {
    const workingEquation = equation || Object.keys(bucketsPath).join(' + ');
    return Object.keys(bucketsPath).reduce((acc, key) => {
      return acc.replace(key, `params.${key}`);
    }, workingEquation);
  }

  private buildMetricEquation(type: 'good' | 'total', metricDef: MetricCustomMetricDef) {
    const bucketsPath = metricDef.metrics.reduce(
      (acc, metric) => ({ ...acc, [metric.name]: `_${type}_${metric.name}` }),
      {}
    );
    return {
      bucket_script: {
        buckets_path: bucketsPath,
        script: {
          source: this.convertEquationToPainless(bucketsPath, metricDef.equation),
          lang: 'painless',
        },
      },
    };
  }

  private buildAggregations(slo: SLO, indicator: MetricCustomIndicator) {
    if (indicator.params.good.equation.match(INVALID_EQUATION_REGEX)) {
      throw new Error(`Invalid equation: ${indicator.params.good.equation}`);
    }

    if (indicator.params.total.equation.match(INVALID_EQUATION_REGEX)) {
      throw new Error(`Invalid equation: ${indicator.params.total.equation}`);
    }

    const goodAggregations = this.buildMetricAggregations('good', indicator.params.good);
    const totalAggregations = this.buildMetricAggregations('total', indicator.params.total);

    return {
      ...goodAggregations,
      ...totalAggregations,
      'slo.numerator': this.buildMetricEquation('good', indicator.params.good),
      'slo.denominator': this.buildMetricEquation('total', indicator.params.total),
      ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
        'slo.isGoodSlice': {
          bucket_script: {
            buckets_path: {
              goodEvents: 'slo.numerator',
              totalEvents: 'slo.denominator',
            },
            script: `params.goodEvents / params.totalEvents >= ${slo.objective.timesliceTarget} ? 1 : 0`,
          },
        },
      }),
    };
  }
}
