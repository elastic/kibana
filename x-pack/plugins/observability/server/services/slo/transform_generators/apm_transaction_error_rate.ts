/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MappingRuntimeFields,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/types';
import {
  ALL_VALUE,
  apmTransactionErrorRateIndicatorSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';

import { InvalidTransformError } from '../../../errors';
import { getSLOTransformTemplate } from '../../../assets/transform_templates/slo_transform_template';
import { getElastichsearchQueryOrThrow, TransformGenerator } from '.';
import {
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
  getSLOTransformId,
} from '../../../assets/constants';
import { APMTransactionErrorRateIndicator, SLO } from '../../../domain/models';
import { Query } from './types';
import { parseIndex } from './common';

export class ApmTransactionErrorRateTransformGenerator extends TransformGenerator {
  public getTransformParams(slo: SLO): TransformPutTransformRequest {
    if (!apmTransactionErrorRateIndicatorSchema.is(slo.indicator)) {
      throw new InvalidTransformError(`Cannot handle SLO of indicator type: ${slo.indicator.type}`);
    }

    const extraGroupByFields = {
      'service.name': { terms: { field: 'service.name' } },
      'service.environment': { terms: { field: 'service.environment' } },
      'transaction.name': { terms: { field: 'transaction.name' } },
      'transaction.type': { terms: { field: 'transaction.type' } },
    };

    return getSLOTransformTemplate(
      this.buildTransformId(slo),
      this.buildDescription(slo),
      this.buildSource(slo, slo.indicator),
      this.buildDestination(),
      this.buildGroupBy(slo, '@timestamp', extraGroupByFields),
      this.buildAggregations(slo),
      this.buildSettings(slo)
    );
  }

  private buildTransformId(slo: SLO): string {
    return getSLOTransformId(slo.id, slo.revision);
  }

  private buildSource(slo: SLO, indicator: APMTransactionErrorRateIndicator) {
    const extraRuntimeMappings: MappingRuntimeFields = {};
    const queryFilter: Query[] = [
      {
        range: {
          '@timestamp': {
            gte: `now-${slo.timeWindow.duration.format()}`,
          },
        },
      },
    ];

    if (indicator.params.service !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'service.name': indicator.params.service,
        },
      });
      extraRuntimeMappings['service.name'] = {
        type: 'keyword',
        script: {
          source: `emit('${indicator.params.service}')`,
        },
      };
    }

    if (indicator.params.environment !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'service.environment': indicator.params.environment,
        },
      });
      extraRuntimeMappings['service.environment'] = {
        type: 'keyword',
        script: {
          source: `emit('${indicator.params.environment}')`,
        },
      };
    }

    if (indicator.params.transactionName !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'transaction.name': indicator.params.transactionName,
        },
      });
      extraRuntimeMappings['transaction.name'] = {
        type: 'keyword',
        script: {
          source: `emit('${indicator.params.transactionName}')`,
        },
      };
    }

    if (indicator.params.transactionType !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'transaction.type': indicator.params.transactionType,
        },
      });
      extraRuntimeMappings['transaction.type'] = {
        type: 'keyword',
        script: {
          source: `emit('${indicator.params.transactionType}')`,
        },
      };
    }

    if (indicator.params.filter) {
      queryFilter.push(getElastichsearchQueryOrThrow(indicator.params.filter));
    }

    return {
      index: parseIndex(indicator.params.index),
      runtime_mappings: this.buildCommonRuntimeMappings(slo, extraRuntimeMappings),
      query: {
        bool: {
          filter: [
            { term: { 'metricset.name': 'transaction' } },
            { terms: { 'event.outcome': ['success', 'failure'] } },
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

  private buildAggregations(slo: SLO) {
    return {
      'slo.numerator': {
        filter: {
          bool: {
            should: {
              match: {
                'event.outcome': 'success',
              },
            },
          },
        },
      },
      'slo.denominator': {
        filter: {
          match_all: {},
        },
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
