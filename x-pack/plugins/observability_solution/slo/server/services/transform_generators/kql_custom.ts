/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { kqlCustomIndicatorSchema, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';

import { DataViewsService } from '@kbn/data-views-plugin/common';
import { InvalidTransformError } from '../../errors';
import { getSLOTransformTemplate } from '../../assets/transform_templates/slo_transform_template';
import { getElasticsearchQueryOrThrow, parseIndex, TransformGenerator } from '.';
import {
  getSLOTransformId,
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
} from '../../../common/constants';
import { KQLCustomIndicator, SLODefinition } from '../../domain/models';
import { getTimesliceTargetComparator, getFilterRange } from './common';

export class KQLCustomTransformGenerator extends TransformGenerator {
  public async getTransformParams(
    slo: SLODefinition,
    spaceId: string,
    dataViewService: DataViewsService
  ): Promise<TransformPutTransformRequest> {
    if (!kqlCustomIndicatorSchema.is(slo.indicator)) {
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
    indicator: KQLCustomIndicator,
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

  private buildAggregations(slo: SLODefinition, indicator: KQLCustomIndicator) {
    const numerator = getElasticsearchQueryOrThrow(indicator.params.good);
    const denominator = getElasticsearchQueryOrThrow(indicator.params.total);

    return {
      'slo.numerator': {
        filter: numerator,
      },
      'slo.denominator': {
        filter: denominator,
      },
      ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
        'slo.isGoodSlice': {
          bucket_script: {
            buckets_path: {
              goodEvents: 'slo.numerator>_count',
              totalEvents: 'slo.denominator>_count',
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
