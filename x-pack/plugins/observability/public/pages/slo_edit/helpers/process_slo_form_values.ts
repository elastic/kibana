/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateSLOInput, Indicator, SLOWithSummaryResponse, UpdateSLOInput } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import { RecursivePartial } from '@kbn/utility-types';
import { toDuration } from '../../../utils/slo/duration';
import {
  APM_AVAILABILITY_DEFAULT_VALUES,
  APM_LATENCY_DEFAULT_VALUES,
  CUSTOM_KQL_DEFAULT_VALUES,
  CUSTOM_METRIC_DEFAULT_VALUES,
  HISTOGRAM_DEFAULT_VALUES,
} from '../constants';
import { CreateSLOForm } from '../types';

export function transformSloResponseToCreateSloForm(
  values: SLOWithSummaryResponse | undefined
): CreateSLOForm | undefined {
  if (!values) return undefined;

  return {
    name: values.name,
    description: values.description,
    indicator: values.indicator,
    budgetingMethod: values.budgetingMethod,
    timeWindow: {
      duration: values.timeWindow.duration,
      type: values.timeWindow.type,
    },
    objective: {
      target: values.objective.target * 100,
      ...(values.budgetingMethod === 'timeslices' &&
        values.objective.timesliceTarget && {
          timesliceTarget: values.objective.timesliceTarget * 100,
        }),
      ...(values.budgetingMethod === 'timeslices' &&
        values.objective.timesliceWindow && {
          timesliceWindow: String(toDuration(values.objective.timesliceWindow).value),
        }),
    },
    groupBy: values.groupBy,
    tags: values.tags,
  };
}

export function transformCreateSLOFormToCreateSLOInput(values: CreateSLOForm): CreateSLOInput {
  return {
    name: values.name,
    description: values.description,
    indicator: values.indicator,
    budgetingMethod: values.budgetingMethod,
    timeWindow: {
      duration: values.timeWindow.duration,
      type: values.timeWindow.type,
    },
    objective: {
      target: values.objective.target / 100,
      ...(values.budgetingMethod === 'timeslices' &&
        values.objective.timesliceTarget && {
          timesliceTarget: values.objective.timesliceTarget / 100,
        }),
      ...(values.budgetingMethod === 'timeslices' &&
        values.objective.timesliceWindow && {
          timesliceWindow: `${values.objective.timesliceWindow}m`,
        }),
    },
    tags: values.tags,
    groupBy: values.groupBy,
  };
}

export function transformValuesToUpdateSLOInput(values: CreateSLOForm): UpdateSLOInput {
  return {
    name: values.name,
    description: values.description,
    indicator: values.indicator,
    budgetingMethod: values.budgetingMethod,
    timeWindow: {
      duration: values.timeWindow.duration,
      type: values.timeWindow.type,
    },
    objective: {
      target: values.objective.target / 100,
      ...(values.budgetingMethod === 'timeslices' &&
        values.objective.timesliceTarget && {
          timesliceTarget: values.objective.timesliceTarget / 100,
        }),
      ...(values.budgetingMethod === 'timeslices' &&
        values.objective.timesliceWindow && {
          timesliceWindow: `${values.objective.timesliceWindow}m`,
        }),
    },
    tags: values.tags,
    groupBy: values.groupBy,
  };
}

function transformPartialIndicatorState(
  indicator?: RecursivePartial<Indicator>
): Indicator | undefined {
  if (indicator === undefined || indicator.type === undefined) return undefined;

  const indicatorType = indicator.type;
  switch (indicatorType) {
    case 'sli.apm.transactionDuration':
      return {
        type: 'sli.apm.transactionDuration' as const,
        params: Object.assign({}, APM_LATENCY_DEFAULT_VALUES.params, indicator.params ?? {}),
      };
    case 'sli.apm.transactionErrorRate':
      return {
        type: 'sli.apm.transactionErrorRate' as const,
        params: Object.assign({}, APM_AVAILABILITY_DEFAULT_VALUES.params, indicator.params ?? {}),
      };
    case 'sli.histogram.custom':
      return {
        type: 'sli.histogram.custom' as const,
        params: Object.assign({}, HISTOGRAM_DEFAULT_VALUES.params, indicator.params ?? {}),
      };
    case 'sli.kql.custom':
      return {
        type: 'sli.kql.custom' as const,
        params: Object.assign({}, CUSTOM_KQL_DEFAULT_VALUES.params, indicator.params ?? {}),
      };
    case 'sli.metric.custom':
      return {
        type: 'sli.metric.custom' as const,
        params: Object.assign({}, CUSTOM_METRIC_DEFAULT_VALUES.params, indicator.params ?? {}),
      };
    default:
      assertNever(indicatorType);
  }
}

export function transformPartialUrlStateToFormState(
  values: RecursivePartial<Pick<CreateSLOInput, 'indicator'>>
): Partial<CreateSLOForm> | {} {
  const state: Partial<CreateSLOForm> = {};

  const parsedIndicator = transformPartialIndicatorState(values.indicator);
  if (parsedIndicator !== undefined) state.indicator = parsedIndicator;

  return state;
}
