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

  public buildDescription(slo: SLO): string {
    return `Rolled-up SLI data for SLO: ${slo.name}`;
  }

  public buildGroupBy(slo: SLO, sourceIndexTimestampField: string | undefined = '@timestamp') {
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
      // timestamp field defined in the destination index
      '@timestamp': {
        date_histogram: {
          field: sourceIndexTimestampField, // timestamp field defined in the source index
          fixed_interval: fixedInterval,
        },
      },
    };
  }

  public buildSettings(
    slo: SLO,
    sourceIndexTimestampField: string | undefined = '@timestamp'
  ): TransformSettings {
    return {
      frequency: slo.settings.frequency.format(),
      sync_field: sourceIndexTimestampField, // timestamp field defined in the source index
      sync_delay: slo.settings.syncDelay.format(),
    };
  }
}
