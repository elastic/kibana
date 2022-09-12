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
import { getSLODestinationIndexName, SLO_INGEST_PIPELINE_NAME } from '../../../assets/constants';
import { getSLOTransformTemplate } from '../../../assets/transform_templates/slo_transform_template';
import {
  apmTransactionErrorRateSLOSchema,
  APMTransactionErrorRateSLO,
  SLO,
} from '../../../types/models';
import { ALL_VALUE } from '../../../types/schema';
import { TransformGenerator } from '.';

const APM_SOURCE_INDEX = 'metrics-apm*';
const ALLOWED_STATUS_CODES = ['2xx', '3xx', '4xx', '5xx'];
const DEFAULT_GOOD_STATUS_CODES = ['2xx', '3xx', '4xx'];

export class ApmTransactionErrorRateTransformGenerator implements TransformGenerator {
  public getTransformParams(slo: SLO, spaceId: string): TransformPutTransformRequest {
    if (!apmTransactionErrorRateSLOSchema.is(slo)) {
      throw new Error(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildSource(slo),
      this.buildDestination(slo, spaceId),
      this.buildGroupBy(),
      this.buildAggregations(slo)
    );
  }

  private buildTransformId(slo: APMTransactionErrorRateSLO): string {
    return `slo-${slo.id}`;
  }

  private buildSource(slo: APMTransactionErrorRateSLO) {
    const queryFilter = [];
    if (slo.indicator.params.service !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'service.name': slo.indicator.params.service,
        },
      });
    }

    if (slo.indicator.params.environment !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'service.environment': slo.indicator.params.environment,
        },
      });
    }

    if (slo.indicator.params.transaction_name !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'transaction.name': slo.indicator.params.transaction_name,
        },
      });
    }

    if (slo.indicator.params.transaction_type !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'transaction.type': slo.indicator.params.transaction_type,
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

  private buildDestination(slo: APMTransactionErrorRateSLO, spaceId: string) {
    if (slo.settings.destination_index === undefined) {
      return {
        pipeline: SLO_INGEST_PIPELINE_NAME,
        index: getSLODestinationIndexName(spaceId),
      };
    }

    return { index: slo.settings.destination_index };
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

  private buildAggregations(slo: APMTransactionErrorRateSLO) {
    const goodStatusCodesFilter = this.getGoodStatusCodesFilter(
      slo.indicator.params.good_status_codes
    );

    return {
      'slo.numerator': {
        filter: {
          bool: {
            should: goodStatusCodesFilter,
          },
        },
      },
      'slo.denominator': {
        value_count: {
          field: 'transaction.duration.histogram',
        },
      },
    };
  }

  private getGoodStatusCodesFilter(goodStatusCodes: string[] | undefined) {
    let statusCodes = goodStatusCodes?.filter((code) => ALLOWED_STATUS_CODES.includes(code));
    if (statusCodes === undefined || statusCodes.length === 0) {
      statusCodes = DEFAULT_GOOD_STATUS_CODES;
    }

    return statusCodes.map((code) => ({
      match: {
        'transaction.result': `HTTP ${code}`,
      },
    }));
  }
}
