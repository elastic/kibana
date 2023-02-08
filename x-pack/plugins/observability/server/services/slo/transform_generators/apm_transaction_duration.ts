/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  ALL_VALUE,
  apmTransactionDurationIndicatorSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { InvalidTransformError } from '../../../errors';
import {
  SLO_DESTINATION_INDEX_NAME,
  SLO_INGEST_PIPELINE_NAME,
  getSLOTransformId,
} from '../../../assets/constants';
import { getSLOTransformTemplate } from '../../../assets/transform_templates/slo_transform_template';
import { SLO, APMTransactionDurationIndicator } from '../../../domain/models';
import { TransformGenerator } from '.';
import { DEFAULT_APM_INDEX } from './constants';
import { Query } from './types';

export class ApmTransactionDurationTransformGenerator extends TransformGenerator {
  public getTransformParams(slo: SLO): TransformPutTransformRequest {
    if (!apmTransactionDurationIndicatorSchema.is(slo.indicator)) {
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

  private buildSource(slo: SLO, indicator: APMTransactionDurationIndicator) {
    const queryFilter: Query[] = [
      {
        range: {
          [slo.settings.timestampField]: {
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
    }

    if (indicator.params.environment !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'service.environment': indicator.params.environment,
        },
      });
    }

    if (indicator.params.transactionName !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'transaction.name': indicator.params.transactionName,
        },
      });
    }

    if (indicator.params.transactionType !== ALL_VALUE) {
      queryFilter.push({
        match: {
          'transaction.type': indicator.params.transactionType,
        },
      });
    }

    return {
      index: indicator.params.index ?? DEFAULT_APM_INDEX,
      runtime_mappings: this.buildCommonRuntimeMappings(slo),
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

  private buildAggregations(slo: SLO, indicator: APMTransactionDurationIndicator) {
    const truncatedThreshold = Math.trunc(indicator.params['threshold.us']);

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
