/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { kqlCustomIndicatorSchema, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';

import { InvalidTransformError } from '../../../errors';
import { getSLOTransformTemplate } from '../../../assets/transform_templates/slo_transform_template';
import { TransformGenerator } from '.';
import {
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
  getSLOTransformId,
} from '../../../assets/constants';
import { KQLCustomIndicator, SLO } from '../../../domain/models';

export class KQLCustomTransformGenerator extends TransformGenerator {
  public getTransformParams(slo: SLO): TransformPutTransformRequest {
    if (!kqlCustomIndicatorSchema.is(slo.indicator)) {
      throw new InvalidTransformError(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildSource(slo, slo.indicator),
      this.buildDestination(),
      this.buildCommonGroupBy(slo),
      this.buildAggregations(slo, slo.indicator),
      this.buildSettings(slo)
    );
  }

  private buildTransformId(slo: SLO): string {
    return getSLOTransformId(slo.id, slo.revision);
  }

  private buildSource(slo: SLO, indicator: KQLCustomIndicator) {
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

  private buildAggregations(slo: SLO, indicator: KQLCustomIndicator) {
    const numerator = getElastichsearchQueryOrThrow(indicator.params.good);
    const denominator = getElastichsearchQueryOrThrow(indicator.params.total);

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
            script: `params.goodEvents / params.totalEvents >= ${slo.objective.timesliceTarget} ? 1 : 0`,
          },
        },
      }),
    };
  }
}

function getElastichsearchQueryOrThrow(kuery: string) {
  try {
    return toElasticsearchQuery(fromKueryExpression(kuery));
  } catch (err) {
    throw new InvalidTransformError(`Invalid KQL: ${kuery}`);
  }
}
