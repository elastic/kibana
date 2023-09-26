/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricCustomIndicator } from '@kbn/slo-schema';
import { FormState, UseFormGetFieldState, UseFormGetValues, UseFormWatch } from 'react-hook-form';
import { isObject } from 'lodash';
import { CreateSLOForm } from '../types';

interface Props {
  getFieldState: UseFormGetFieldState<CreateSLOForm>;
  getValues: UseFormGetValues<CreateSLOForm>;
  formState: FormState<CreateSLOForm>;
  watch: UseFormWatch<CreateSLOForm>;
}

export function useSectionFormValidation({ getFieldState, getValues, formState, watch }: Props) {
  let isIndicatorSectionValid: boolean = false;

  switch (watch('indicator.type')) {
    case 'sli.metric.custom':
      const isGoodParamsValid = () => {
        const data = getValues('indicator.params.good') as MetricCustomIndicator['params']['good'];
        const isEquationValid = !getFieldState('indicator.params.good.equation').invalid;
        const areMetricsValid =
          isObject(data) && (data.metrics ?? []).every((metric) => Boolean(metric.field));
        return isEquationValid && areMetricsValid;
      };

      const isTotalParamsValid = () => {
        const data = getValues(
          'indicator.params.total'
        ) as MetricCustomIndicator['params']['total'];
        const isEquationValid = !getFieldState('indicator.params.total.equation').invalid;
        const areMetricsValid =
          isObject(data) && (data.metrics ?? []).every((metric) => Boolean(metric.field));
        return isEquationValid && areMetricsValid;
      };

      isIndicatorSectionValid =
        (
          [
            'indicator.params.index',
            'indicator.params.filter',
            'indicator.params.timestampField',
          ] as const
        ).every((field) => !getFieldState(field).invalid) &&
        (['indicator.params.index', 'indicator.params.timestampField'] as const).every(
          (field) => !!getValues(field)
        ) &&
        isGoodParamsValid() &&
        isTotalParamsValid();
      break;
    case 'sli.histogram.custom':
      const isRangeValid = (type: 'good' | 'total') => {
        const aggregation = getValues(`indicator.params.${type}.aggregation`);
        // If aggreagtion is a value count we can exit early with true
        if (aggregation === 'value_count') {
          return true;
        }
        const from = getValues(`indicator.params.${type}.from`);
        const to = getValues(`indicator.params.${type}.to`);
        // If both from and to are defined and from is less that to, return true
        if (from != null && to != null && from < to) {
          return true;
        }
        return false;
      };
      isIndicatorSectionValid =
        (
          [
            'indicator.params.index',
            'indicator.params.filter',
            'indicator.params.timestampField',
            'indicator.params.good.aggregation',
            'indicator.params.total.aggregation',
            'indicator.params.good.field',
            'indicator.params.total.field',
            'indicator.params.good.filter',
            'indicator.params.total.filter',
          ] as const
        ).every((field) => !getFieldState(field).invalid) &&
        (
          [
            'indicator.params.good.aggregation',
            'indicator.params.total.aggregation',
            'indicator.params.good.field',
            'indicator.params.total.field',
            'indicator.params.index',
            'indicator.params.timestampField',
          ] as const
        ).every((field) => !!getValues(field)) &&
        isRangeValid('good') &&
        isRangeValid('total');
      break;
    case 'sli.kql.custom':
      isIndicatorSectionValid =
        (
          [
            'indicator.params.index',
            'indicator.params.filter',
            'indicator.params.total',
            'indicator.params.timestampField',
          ] as const
        ).every((field) => !getFieldState(field).invalid) &&
        (
          [
            'indicator.params.good',
            'indicator.params.index',
            'indicator.params.timestampField',
          ] as const
        ).every((field) => !!getValues(field));
      break;
    case 'sli.apm.transactionDuration':
      isIndicatorSectionValid =
        (
          [
            'indicator.params.service',
            'indicator.params.environment',
            'indicator.params.transactionType',
            'indicator.params.transactionName',
            'indicator.params.threshold',
          ] as const
        ).every((field) => !getFieldState(field, formState).invalid && getValues(field) !== '') &&
        !getFieldState('indicator.params.index', formState).invalid;
      break;
    case 'sli.apm.transactionErrorRate':
      isIndicatorSectionValid =
        (
          [
            'indicator.params.service',
            'indicator.params.environment',
            'indicator.params.transactionType',
            'indicator.params.transactionName',
          ] as const
        ).every((field) => !getFieldState(field, formState).invalid && getValues(field) !== '') &&
        (['indicator.params.index'] as const).every(
          (field) => !getFieldState(field, formState).invalid
        );
      break;
    default:
      isIndicatorSectionValid = false;
      break;
  }

  const isObjectiveSectionValid = (
    [
      'budgetingMethod',
      'timeWindow.duration',
      'objective.target',
      'objective.timesliceTarget',
      'objective.timesliceWindow',
    ] as const
  ).every((field) => getFieldState(field).error === undefined);

  const isDescriptionSectionValid =
    !getFieldState('name').invalid &&
    getValues('name') !== '' &&
    !getFieldState('description').invalid;

  return {
    isIndicatorSectionValid,
    isObjectiveSectionValid,
    isDescriptionSectionValid,
  };
}
