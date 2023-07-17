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
  apmTransactionDurationIndicatorSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { getElastichsearchQueryOrThrow, TransformGenerator } from '.';
import {
  getSLOTransformId,
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
} from '../../../assets/constants';
import { getSLOTransformTemplate } from '../../../assets/transform_templates/slo_transform_template';
import { APMTransactionDurationIndicator, SLO } from '../../../domain/models';
import { InvalidTransformError } from '../../../errors';
import { parseIndex } from './common';
import { Query } from './types';

export class ApmTransactionDurationTransformGenerator extends TransformGenerator {
  public getTransformParams(slo: SLO): TransformPutTransformRequest {
    if (!apmTransactionDurationIndicatorSchema.is(slo.indicator)) {
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
      this.buildAggregations(slo, slo.indicator),
      this.buildSettings(slo)
    );
  }

  private buildTransformId(slo: SLO): string {
    return getSLOTransformId(slo.id, slo.revision);
  }

  private buildSource(slo: SLO, indicator: APMTransactionDurationIndicator) {
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

    if (!!indicator.params.filter) {
      queryFilter.push(getElastichsearchQueryOrThrow(indicator.params.filter));
    }

    return {
      index: parseIndex(indicator.params.index),
      runtime_mappings: this.buildCommonRuntimeMappings(slo, extraRuntimeMappings),
      query: {
        bool: {
          filter: [
            { terms: { 'processor.event': ['metric'] } },
            { term: { 'metricset.name': 'transaction' } },
            { exists: { field: 'transaction.duration.histogram' } },
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

  private buildAggregations(slo: SLO, indicator: APMTransactionDurationIndicator) {
    // threshold is in ms (milliseconds), but apm data is stored in us (microseconds)
    const truncatedThreshold = Math.trunc(indicator.params.threshold * 1000);

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
      ...(timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && {
        'slo.isGoodSlice': {
          bucket_script: {
            buckets_path: {
              goodEvents: 'slo.numerator.value',
              totalEvents: 'slo.denominator.value',
            },
            script: `params.goodEvents / params.totalEvents >= ${slo.objective.timesliceTarget} ? 1 : 0`,
          },
        },
      }),
    };
  }
}
