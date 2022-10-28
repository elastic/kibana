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
import {
  calendarAlignedTimeWindowSchema,
  rollingTimeWindowSchema,
  timeslicesBudgetingMethodSchema,
} from '../../../types/schema';
import { SLO } from '../../../types/models';

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
          source: `emit('${slo.budgeting_method}')`,
        },
      },
      'slo._internal.objective.target': {
        type: 'double' as MappingRuntimeFieldType,
        script: {
          source: `emit(${slo.objective.target})`,
        },
      },
      ...(timeslicesBudgetingMethodSchema.is(slo.budgeting_method) && {
        'slo._internal.objective.timeslice_target': {
          type: 'double' as MappingRuntimeFieldType,
          script: {
            source: `emit(${slo.objective.timeslice_target})`,
          },
        },
        'slo._internal.objective.timeslice_window': {
          type: 'keyword' as MappingRuntimeFieldType,
          script: {
            source: `emit('${slo.objective.timeslice_window?.format()}')`,
          },
        },
      }),
      'slo._internal.time_window.duration': {
        type: 'keyword' as MappingRuntimeFieldType,
        script: {
          source: `emit('${slo.time_window.duration.format()}')`,
        },
      },
      ...(calendarAlignedTimeWindowSchema.is(slo.time_window) && {
        'slo._internal.time_window.is_rolling': {
          type: 'boolean' as MappingRuntimeFieldType,
          script: {
            source: `emit(false)`,
          },
        },
      }),
      ...(rollingTimeWindowSchema.is(slo.time_window) && {
        'slo._internal.time_window.is_rolling': {
          type: 'boolean' as MappingRuntimeFieldType,
          script: {
            source: `emit(true)`,
          },
        },
      }),
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
      ...(timeslicesBudgetingMethodSchema.is(slo.budgeting_method) && {
        'slo._internal.objective.timeslice_target': {
          terms: {
            field: 'slo._internal.objective.timeslice_target',
          },
        },
        'slo._internal.objective.timeslice_window': {
          terms: {
            field: 'slo._internal.objective.timeslice_window',
          },
        },
      }),
      '@timestamp': {
        date_histogram: {
          field: '@timestamp',
          calendar_interval: '1m' as AggregationsCalendarInterval,
        },
      },
    };
  }
}
