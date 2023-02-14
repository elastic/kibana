/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFieldType } from '@elastic/elasticsearch/lib/api/types';
import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';

import { TransformSettings } from '../../../assets/transform_templates/slo_transform_template';
import { SLO } from '../../../domain/models';

export abstract class TransformGenerator {
  public abstract getTransformParams(slo: SLO): TransformPutTransformRequest;

  public buildCommonRuntimeMappings(slo: SLO) {
    return {
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
    };
  }

  public buildCommonGroupBy(slo: SLO) {
    let fixedInterval = '1m';
    if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      fixedInterval = slo.objective.timesliceWindow!.format();
    }

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
      // Field used in the destination index, using @timestamp as per mapping definition
      '@timestamp': {
        date_histogram: {
          field: slo.settings.timestampField,
          fixed_interval: fixedInterval,
        },
      },
    };
  }

  public buildSettings(slo: SLO): TransformSettings {
    return {
      frequency: slo.settings.frequency.format(),
      sync_field: slo.settings.timestampField,
      sync_delay: slo.settings.syncDelay.format(),
    };
  }
}
