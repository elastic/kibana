/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { metricCustomIndicatorSchema, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';

import { DataViewsService } from '@kbn/data-views-plugin/common';
import { InvalidTransformError } from '../../errors';
import { getSLOTransformTemplate } from '../../assets/transform_templates/slo_transform_template';
import { getElasticsearchQueryOrThrow, parseIndex, TransformGenerator } from '.';
import {
  getSLOTransformId,
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
} from '../../../common/constants';
import { MetricCustomIndicator, SLODefinition } from '../../domain/models';
import { GetCustomMetricIndicatorAggregation } from '../aggregations';
import { getTimesliceTargetComparator, getFilterRange } from './common';

export const INVALID_EQUATION_REGEX = /[^A-Z|+|\-|\s|\d+|\.|\(|\)|\/|\*|>|<|=|\?|\:|&|\!|\|]+/g;

export class MetricCustomTransformGenerator extends TransformGenerator {
  public async getTransformParams(
    slo: SLODefinition,
    spaceId: string,
    dataViewService: DataViewsService
  ): Promise<TransformPutTransformRequest> {
    if (!metricCustomIndicatorSchema.is(slo.indicator)) {
      throw new InvalidTransformError(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildDescription(slo),
      await this.buildSource(slo, slo.indicator, dataViewService),
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

  private async buildSource(
    slo: SLODefinition,
    indicator: MetricCustomIndicator,
    dataViewService: DataViewsService
  ) {
    const dataView = await this.getIndicatorDataView({
      dataViewService,
      dataViewId: indicator.params.dataViewId,
    });
    return {
      index: parseIndex(indicator.params.index),
      runtime_mappings: this.buildCommonRuntimeMappings(slo, dataView),
      query: {
        bool: {
          filter: [
            getFilterRange(slo, indicator.params.timestampField),
            getElasticsearchQueryOrThrow(indicator.params.filter, dataView),
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

  private buildAggregations(slo: SLODefinition, indicator: MetricCustomIndicator) {
    if (indicator.params.good.equation.match(INVALID_EQUATION_REGEX)) {
      throw new Error(`Invalid equation: ${indicator.params.good.equation}`);
    }

    if (indicator.params.total.equation.match(INVALID_EQUATION_REGEX)) {
      throw new Error(`Invalid equation: ${indicator.params.total.equation}`);
    }

    const getCustomMetricIndicatorAggregation = new GetCustomMetricIndicatorAggregation(indicator);
    return {
      ...getCustomMetricIndicatorAggregation.execute({
        type: 'good',
        aggregationKey: 'slo.numerator',
      }),
      ...getCustomMetricIndicatorAggregation.execute({
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
            script: `params.goodEvents / params.totalEvents ${getTimesliceTargetComparator(
              slo.objective.timesliceTarget!
            )} ${slo.objective.timesliceTarget} ? 1 : 0`,
          },
        },
      }),
    };
  }
}
