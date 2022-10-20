/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsCalendarInterval,
  MappingRuntimeFieldType,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import { kqlCustomIndicatorSchema } from '../../../types/schema';
import { getSLOTransformTemplate } from '../../../assets/transform_templates/slo_transform_template';
import { TransformGenerator } from '.';
import {
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
  getSLOTransformId,
} from '../../../assets/constants';
import { KQLCustomIndicator, SLO } from '../../../types/models';

export class KQLCustomTransformGenerator implements TransformGenerator {
  public getTransformParams(slo: SLO): TransformPutTransformRequest {
    if (!kqlCustomIndicatorSchema.is(slo.indicator)) {
      throw new Error(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildSource(slo, slo.indicator),
      this.buildDestination(),
      this.buildGroupBy(),
      this.buildAggregations(slo, slo.indicator)
    );
  }

  private buildTransformId(slo: SLO): string {
    return getSLOTransformId(slo.id, slo.revision);
  }

  private buildSource(slo: SLO, indicator: KQLCustomIndicator) {
    const filter = toElasticsearchQuery(fromKueryExpression(indicator.params.query_filter));
    return {
      index: indicator.params.index,
      runtime_mappings: {
        'slo.id': {
          type: 'keyword' as MappingRuntimeFieldType,
          script: {
            source: `emit('${slo.id}')`,
          },
        },
        'slo.revision': {
          type: 'long' as MappingRuntimeFieldType,
          script: {
            source: `emit(${slo.revision})`,
          },
        },
      },
      query: filter,
    };
  }

  private buildDestination() {
    return {
      pipeline: SLO_INGEST_PIPELINE_NAME,
      index: SLO_DESTINATION_INDEX_NAME,
    };
  }

  private buildGroupBy() {
    return {
      'slo.id': {
        terms: {
          field: 'slo.id',
        },
      },
      'slo.revision': {
        terms: {
          field: 'slo.revision',
        },
      },
      '@timestamp': {
        date_histogram: {
          field: '@timestamp',
          calendar_interval: '1m' as AggregationsCalendarInterval,
        },
      },
    };
  }

  private buildAggregations(slo: SLO, indicator: KQLCustomIndicator) {
    const numerator = toElasticsearchQuery(fromKueryExpression(indicator.params.numerator));
    const denominator = toElasticsearchQuery(fromKueryExpression(indicator.params.denominator));
    return {
      'slo.numerator': {
        filter: numerator,
      },
      'slo.denominator': {
        filter: denominator,
      },
    };
  }
}
