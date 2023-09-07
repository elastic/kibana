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
import { TransformSettings } from '../../../assets/transform_templates/slo_transform_template';
import { SLO } from '../../../domain/models';

export abstract class TransformGenerator {
  public abstract getTransformParams(slo: SLO): TransformPutTransformRequest;

  public buildCommonRuntimeMappings(slo: SLO): MappingRuntimeFields {
    const mustIncludeAllInstanceId = slo.groupBy === ALL_VALUE || slo.groupBy === '';

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
      'slo.groupBy': {
        type: 'keyword',
        script: {
          source: `emit('${!!slo.groupBy ? slo.groupBy : ALL_VALUE}')`,
        },
      },
      ...(mustIncludeAllInstanceId && {
        'slo.instanceId': {
          type: 'keyword',
          script: {
            source: `emit('${ALL_VALUE}')`,
          },
        },
      }),
      'slo.name': {
        type: 'keyword',
        script: {
          source: `emit('${slo.name}')`,
        },
      },
      'slo.description': {
        type: 'keyword',
        script: {
          source: `emit('${slo.description}')`,
        },
      },
      'slo.tags': {
        type: 'keyword',
        script: {
          source: `emit('${slo.tags}')`,
        },
      },
      'slo.indicator.type': {
        type: 'keyword',
        script: {
          source: `emit('${slo.indicator.type}')`,
        },
      },
      'slo.objective.target': {
        type: 'double',
        script: {
          source: `emit(${slo.objective.target})`,
        },
      },
      ...(slo.objective.timesliceWindow && {
        'slo.objective.sliceDurationInSeconds': {
          type: 'long',
          script: {
            source: `emit(${slo.objective.timesliceWindow!.asSeconds()})`,
          },
        },
      }),
      'slo.budgetingMethod': {
        type: 'keyword',
        script: {
          source: `emit('${slo.budgetingMethod}')`,
        },
      },
      'slo.timeWindow.duration': {
        type: 'keyword',
        script: {
          source: `emit('${slo.timeWindow.duration.format()}')`,
        },
      },
      'slo.timeWindow.type': {
        type: 'keyword',
        script: {
          source: `emit('${slo.timeWindow.type}')`,
        },
      },
    };
  }

  public buildDescription(slo: SLO): string {
    return `Rolled-up SLI data for SLO: ${slo.name}`;
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

    const instanceIdField =
      slo.groupBy !== '' && slo.groupBy !== ALL_VALUE ? slo.groupBy : 'slo.instanceId';

    return {
      'slo.id': { terms: { field: 'slo.id' } },
      'slo.revision': { terms: { field: 'slo.revision' } },
      'slo.groupBy': { terms: { field: 'slo.groupBy' } },
      'slo.instanceId': { terms: { field: instanceIdField } },
      'slo.name': { terms: { field: 'slo.name' } },
      'slo.description': { terms: { field: 'slo.description' } },
      'slo.tags': { terms: { field: 'slo.tags' } },
      'slo.indicator.type': { terms: { field: 'slo.indicator.type' } },
      'slo.objective.target': { terms: { field: 'slo.objective.target' } },
      ...(slo.objective.timesliceWindow && {
        'slo.objective.sliceDurationInSeconds': {
          terms: { field: 'slo.objective.sliceDurationInSeconds' },
        },
      }),
      'slo.budgetingMethod': { terms: { field: 'slo.budgetingMethod' } },
      'slo.timeWindow.duration': { terms: { field: 'slo.timeWindow.duration' } },
      'slo.timeWindow.type': { terms: { field: 'slo.timeWindow.type' } },
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
