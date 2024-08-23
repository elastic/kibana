/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateSLOInput, GetSLOResponse, Indicator, UpdateSLOInput } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import { RecursivePartial } from '@kbn/utility-types';
import { cloneDeep } from 'lodash';
import { toDuration } from '../../../utils/slo/duration';
import {
  APM_AVAILABILITY_DEFAULT_VALUES,
  APM_LATENCY_DEFAULT_VALUES,
  CUSTOM_KQL_DEFAULT_VALUES,
  CUSTOM_METRIC_DEFAULT_VALUES,
  HISTOGRAM_DEFAULT_VALUES,
  SLO_EDIT_FORM_DEFAULT_VALUES,
  SLO_EDIT_FORM_DEFAULT_VALUES_SYNTHETICS_AVAILABILITY,
  SYNTHETICS_AVAILABILITY_DEFAULT_VALUES,
  TIMESLICE_METRIC_DEFAULT_VALUES,
} from '../constants';
import { CreateSLOForm } from '../types';

export function transformSloResponseToCreateSloForm(
  values?: GetSLOResponse
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
    groupBy: [values.groupBy].flat(),
    tags: values.tags,
    settings: {
      preventInitialBackfill: values.settings?.preventInitialBackfill ?? false,
    },
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
    groupBy: [values.groupBy].flat(),
    settings: {
      preventInitialBackfill: values.settings?.preventInitialBackfill ?? false,
    },
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
    groupBy: [values.groupBy].flat(),
    settings: {
      preventInitialBackfill: values.settings?.preventInitialBackfill ?? false,
    },
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
    case 'sli.synthetics.availability':
      return {
        type: 'sli.synthetics.availability' as const,
        params: Object.assign(
          {},
          SYNTHETICS_AVAILABILITY_DEFAULT_VALUES.params,
          indicator.params ?? {}
        ),
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
    case 'sli.metric.timeslice':
      return {
        type: 'sli.metric.timeslice' as const,
        params: Object.assign({}, TIMESLICE_METRIC_DEFAULT_VALUES.params, indicator.params ?? {}),
      };
    default:
      assertNever(indicatorType);
  }
}

export function transformPartialUrlStateToFormState(
  values: RecursivePartial<CreateSLOInput>
): CreateSLOForm {
  let state: CreateSLOForm;
  const indicator = transformPartialIndicatorState(values.indicator);

  switch (indicator?.type) {
    case 'sli.synthetics.availability':
      state = cloneDeep(SLO_EDIT_FORM_DEFAULT_VALUES_SYNTHETICS_AVAILABILITY);
      break;
    default:
      state = cloneDeep(SLO_EDIT_FORM_DEFAULT_VALUES);
  }

  if (indicator !== undefined) {
    state.indicator = indicator;
  }

  if (values.name) {
    state.name = values.name;
  }
  if (values.description) {
    state.description = values.description;
  }
  if (!!values.tags) {
    state.tags = values.tags as string[];
  }

  if (values.objective) {
    if (values.objective.target) {
      state.objective = {
        target: values.objective.target * 100,
      };

      if (values.objective.timesliceTarget && values.objective.timesliceWindow) {
        state.objective.timesliceTarget = values.objective.timesliceTarget * 100;
        state.objective.timesliceWindow = String(
          toDuration(values.objective.timesliceWindow).value
        );
      }
    }
  }

  if (values.budgetingMethod) {
    state.budgetingMethod = values.budgetingMethod;
  }

  if (values.groupBy) {
    state.groupBy = [values.groupBy].flat().filter((group) => !!group) as string[];
  }

  if (values.timeWindow?.duration && values.timeWindow?.type) {
    state.timeWindow = { duration: values.timeWindow.duration, type: values.timeWindow.type };
  }

  if (!!values.settings?.preventInitialBackfill) {
    state.settings = { preventInitialBackfill: values.settings.preventInitialBackfill };
  }

  return state;
}
