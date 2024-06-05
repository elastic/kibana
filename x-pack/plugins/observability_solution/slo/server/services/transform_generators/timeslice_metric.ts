/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  timesliceMetricComparatorMapping,
  TimesliceMetricIndicator,
  timesliceMetricIndicatorSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { InvalidTransformError } from '../../errors';
import { getSLOTransformTemplate } from '../../assets/transform_templates/slo_transform_template';
import { getElasticsearchQueryOrThrow, parseIndex, TransformGenerator } from '.';
import {
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
  getSLOTransformId,
} from '../../../common/constants';
import { SLODefinition } from '../../domain/models';
import { GetTimesliceMetricIndicatorAggregation } from '../aggregations';
import { getFilterRange } from './common';

const INVALID_EQUATION_REGEX = /[^A-Z|+|\-|\s|\d+|\.|\(|\)|\/|\*|>|<|=|\?|\:|&|\!|\|]+/g;

export class TimesliceMetricTransformGenerator extends TransformGenerator {
  public getTransformParams(slo: SLODefinition): TransformPutTransformRequest {
    if (!timesliceMetricIndicatorSchema.is(slo.indicator)) {
      throw new InvalidTransformError(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildDescription(slo),
      this.buildSource(slo, slo.indicator),
      this.buildDestination(),
      this.buildCommonGroupBy(slo, slo.indicator.params.timestampField),
      this.buildAggregations(slo, slo.indicator),
      this.buildSettings(slo, slo.indicator.params.timestampField),
      slo
    );
  }

  private buildTransformId(slo: SLODefinition): string {
    return getSLOTransformId(slo.id, slo.revision);
  }

  private buildSource(slo: SLODefinition, indicator: TimesliceMetricIndicator) {
    return {
      index: parseIndex(indicator.params.index),
      runtime_mappings: this.buildCommonRuntimeMappings(slo),
      query: {
        bool: {
          filter: [
            getFilterRange(slo, indicator.params.timestampField),
            getElasticsearchQueryOrThrow(indicator.params.filter),
          ],
        },
      },
    };
  }

  private buildDestination() {
    return {
      pipeline: SLO_INGEST_PIPELINE_NAME,
      index: SLO_DESTINATION_INDEX_NAME,
    };
  }

  private buildAggregations(slo: SLODefinition, indicator: TimesliceMetricIndicator) {
    if (indicator.params.metric.equation.match(INVALID_EQUATION_REGEX)) {
      throw new Error(`Invalid equation: ${indicator.params.metric.equation}`);
    }

    if (!timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      throw new Error('The sli.metric.timeslice indicator MUST have a timeslice budgeting method.');
    }

    const getIndicatorAggregation = new GetTimesliceMetricIndicatorAggregation(indicator);
    const comparator = timesliceMetricComparatorMapping[indicator.params.metric.comparator];
    return {
      ...getIndicatorAggregation.execute('_metric'),
      'slo.numerator': {
        bucket_script: {
          buckets_path: { value: '_metric>value' },
          script: {
            source: `params.value ${comparator} params.threshold ? 1 : 0`,
            params: { threshold: indicator.params.metric.threshold },
          },
        },
      },
      'slo.denominator': {
        bucket_script: {
          buckets_path: {},
          script: '1',
        },
      },
      'slo.isGoodSlice': {
        bucket_script: {
          buckets_path: {
            goodEvents: 'slo.numerator>value',
          },
          script: `params.goodEvents == 1 ? 1 : 0`,
        },
      },
    };
  }
}
