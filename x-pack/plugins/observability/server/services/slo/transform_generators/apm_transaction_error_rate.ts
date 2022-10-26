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
import { InvalidTransformError } from '../../../errors';
import { ALL_VALUE, apmTransactionErrorRateIndicatorSchema } from '../../../types/schema';
import { getSLOTransformTemplate } from '../../../assets/transform_templates/slo_transform_template';
import { TransformGenerator } from '.';
import {
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
  getSLOTransformId,
} from '../../../assets/constants';
import { APMTransactionErrorRateIndicator, SLO } from '../../../types/models';

const APM_SOURCE_INDEX = 'metrics-apm*';
const ALLOWED_STATUS_CODES = ['2xx', '3xx', '4xx', '5xx'];
const DEFAULT_GOOD_STATUS_CODES = ['2xx', '3xx', '4xx'];

export class ApmTransactionErrorRateTransformGenerator implements TransformGenerator {
  public getTransformParams(slo: SLO): TransformPutTransformRequest {
    if (!apmTransactionErrorRateIndicatorSchema.is(slo.indicator)) {
      throw new InvalidTransformError(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
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

  private buildSource(slo: SLO, indicator: APMTransactionErrorRateIndicator) {
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
        'slo.revision': {
          type: 'long' as MappingRuntimeFieldType,
          script: {
            source: `emit(${slo.revision})`,
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

  private buildAggregations(slo: SLO, indicator: APMTransactionErrorRateIndicator) {
    const goodStatusCodesFilter = this.getGoodStatusCodesFilter(indicator.params.good_status_codes);

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
