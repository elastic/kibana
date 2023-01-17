/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFieldType } from '@elastic/elasticsearch/lib/api/types';
import {
  AggregationsCalendarInterval,
  TransformPutTransformRequest,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { calendarAlignedTimeWindowSchema } from '@kbn/slo-schema';

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
      'slo._internal.name': {
        type: 'keyword' as MappingRuntimeFieldType,
        script: {
          source: `emit('${slo.name}')`,
        },
      },
      'slo._internal.budgeting_method': {
        type: 'keyword' as MappingRuntimeFieldType,
        script: {
          source: `emit('${slo.budgetingMethod}')`,
        },
      },
      'slo._internal.objective.target': {
        type: 'double' as MappingRuntimeFieldType,
        script: {
          source: `emit(${slo.objective.target})`,
        },
      },
      'slo._internal.time_window.duration': {
        type: 'keyword' as MappingRuntimeFieldType,
        script: {
          source: `emit('${slo.timeWindow.duration.format()}')`,
        },
      },
      'slo._internal.time_window.is_rolling': {
        type: 'boolean' as MappingRuntimeFieldType,
        script: {
          source: calendarAlignedTimeWindowSchema.is(slo.timeWindow) ? `emit(false)` : `emit(true)`,
        },
      },
    };
  }

  public buildCommonGroupBy(slo: SLO) {
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
      'slo._internal.name': {
        terms: {
          field: 'slo._internal.name',
        },
      },
      'slo._internal.budgeting_method': {
        terms: {
          field: 'slo._internal.budgeting_method',
        },
      },
      'slo._internal.objective.target': {
        terms: {
          field: 'slo._internal.objective.target',
        },
      },
      'slo._internal.time_window.duration': {
        terms: {
          field: 'slo._internal.time_window.duration',
        },
      },
      'slo._internal.time_window.is_rolling': {
        terms: {
          field: 'slo._internal.time_window.is_rolling',
        },
      },
      // Field used in the destination index, using @timestamp as per mapping definition
      '@timestamp': {
        date_histogram: {
          field: slo.settings.timestampField,
          calendar_interval: '1m' as AggregationsCalendarInterval,
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
