/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MappingRuntimeFields,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ALL_VALUE, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import { TransformSettings } from '../../assets/transform_templates/slo_transform_template';
import { SLO } from '../../domain/models';

export abstract class TransformGenerator {
  public abstract getTransformParams(slo: SLO, spaceId: string): TransformPutTransformRequest;

  public buildCommonRuntimeMappings(slo: SLO): MappingRuntimeFields {
    const groupings = [slo.groupBy].flat().filter((value) => !!value);
    const hasGroupings = !groupings.includes(ALL_VALUE) && groupings.length;
    return {
      'slo.id': {
        type: 'keyword',
        script: {
          source: `emit('${slo.id}')`,
        },
      },
      'slo.revision': {
        type: 'long',
        script: {
          source: `emit(${slo.revision})`,
        },
      },
      ...(hasGroupings
        ? {}
        : {
            'slo.instanceId': {
              type: 'keyword',
              script: {
                source: `emit('${ALL_VALUE}')`,
              },
            },
          }),
    };
  }

  public buildDescription(slo: SLO): string {
    return `Rolled-up SLI data for SLO: ${slo.name} [id: ${slo.id}, revision: ${slo.revision}]`;
  }

  public buildCommonGroupBy(
    slo: SLO,
    sourceIndexTimestampField: string | undefined = '@timestamp',
    extraGroupByFields = {}
  ) {
    let fixedInterval = '1m';
    if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      fixedInterval = slo.objective.timesliceWindow!.format();
    }

    const groups = [slo.groupBy].flat().filter((group) => !!group);

    const groupings =
      !groups.includes(ALL_VALUE) && groups.length
        ? groups.reduce((acc, field) => {
            return {
              ...acc,
              [`slo.groupings.${field}`]: {
                terms: {
                  field,
                },
              },
            };
          }, {})
        : { 'slo.instanceId': { terms: { field: 'slo.instanceId' } } };

    return {
      'slo.id': { terms: { field: 'slo.id' } },
      'slo.revision': { terms: { field: 'slo.revision' } },
      ...groupings,
      ...extraGroupByFields,
      // @timestamp field defined in the destination index
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
