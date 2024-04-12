/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  HistogramIndicator,
  histogramIndicatorSchema,
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
import { SLO } from '../../domain/models';
import { GetHistogramIndicatorAggregation } from '../aggregations';

export class HistogramTransformGenerator extends TransformGenerator {
  public getTransformParams(slo: SLO): TransformPutTransformRequest {
    if (!histogramIndicatorSchema.is(slo.indicator)) {
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

  private buildTransformId(slo: SLO): string {
    return getSLOTransformId(slo.id, slo.revision);
  }

  private buildSource(slo: SLO, indicator: HistogramIndicator) {
    return {
      index: parseIndex(indicator.params.index),
      runtime_mappings: this.buildCommonRuntimeMappings(slo),
      query: {
        bool: {
          filter: [
            {
              range: {
                [indicator.params.timestampField]: {
                  gte: `now-${slo.timeWindow.duration.format()}/d`,
                },
              },
            },
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

  private buildAggregations(slo: SLO, indicator: HistogramIndicator) {
    const getHistogramIndicatorAggregations = new GetHistogramIndicatorAggregation(indicator);

    return {
      ...getHistogramIndicatorAggregations.execute({
        type: 'good',
        aggregationKey: 'slo.numerator',
      }),
      ...getHistogramIndicatorAggregations.execute({
        type: 'total',
        aggregationKey: 'slo.denominator',
      }),
      ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
        'slo.isGoodSlice': {
          bucket_script: {
            buckets_path: {
              goodEvents: 'slo.numerator>value',
              totalEvents: 'slo.denominator>value',
            },
            script: `params.goodEvents / params.totalEvents >= ${slo.objective.timesliceTarget} ? 1 : 0`,
          },
        },
      }),
    };
  }
}
