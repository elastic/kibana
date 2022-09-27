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
import { APMTransactionDurationIndicator, SLO } from '../../../domain/models';
import { ALL_VALUE } from '../../../types/schema';
import {
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
  getSLOTransformId,
} from '../../../assets/constants';
import { getSLOTransformTemplate } from '../../../assets/transform_templates/slo_transform_template';
import { TransformGenerator } from '.';

const APM_SOURCE_INDEX = 'metrics-apm*';

export class ApmTransactionDurationTransformGenerator implements TransformGenerator {
  public getTransformParams(slo: SLO): TransformPutTransformRequest {
    if (slo.indicator.type !== 'slo.apm.transaction_duration') {
      throw new Error(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildSource(slo, slo.indicator),
      this.buildDestination(),
      this.buildGroupBy(),
      this.buildAggregations(slo.indicator)
    );
  }

  private buildTransformId(slo: SLO): string {
    return getSLOTransformId(slo.id);
  }

  private buildSource(slo: SLO, indicator: APMTransactionDurationIndicator) {
    const queryFilter = [];
    if (indicator.params.service !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'service.name': indicator.params.service,
        },
      });
    }

    if (indicator.params.environment !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'service.environment': indicator.params.environment,
        },
      });
    }

    if (indicator.params.transaction_name !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'transaction.name': indicator.params.transaction_name,
        },
      });
    }

    if (indicator.params.transaction_type !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'transaction.type': indicator.params.transaction_type,
        },
      });
    }

    return {
      index: APM_SOURCE_INDEX,
      runtime_mappings: {
        'slo.id': {
          type: 'keyword' as MappingRuntimeFieldType,
          script: {
            source: `emit('${slo.id}')`,
          },
        },
      },
      query: {
        bool: {
          filter: [
            {
              match: {
                'transaction.root': true,
              },
            },
            ...queryFilter,
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

  private buildGroupBy() {
    return {
      'slo.id': {
        terms: {
          field: 'slo.id',
        },
      },
      '@timestamp': {
        date_histogram: {
          field: '@timestamp',
          calendar_interval: '1m' as AggregationsCalendarInterval,
        },
      },
      'slo.context.transaction.name': {
        terms: {
          field: 'transaction.name',
        },
      },
      'slo.context.transaction.type': {
        terms: {
          field: 'transaction.type',
        },
      },
      'slo.context.service.name': {
        terms: {
          field: 'service.name',
        },
      },
      'slo.context.service.environment': {
        terms: {
          field: 'service.environment',
        },
      },
    };
  }

  private buildAggregations(indicator: APMTransactionDurationIndicator) {
    const truncatedThreshold = Math.trunc(indicator.params.threshold);

    return {
      _numerator: {
        range: {
          field: 'transaction.duration.histogram',
          ranges: [
            {
              to: truncatedThreshold,
            },
          ],
        },
      },
      'slo.numerator': {
        bucket_script: {
          buckets_path: {
            numerator: `_numerator['*-${truncatedThreshold}.0']>_count`,
          },
          script: 'params.numerator',
        },
      },
      'slo.denominator': {
        value_count: {
          field: 'transaction.duration.histogram',
        },
      },
    };
  }
}
