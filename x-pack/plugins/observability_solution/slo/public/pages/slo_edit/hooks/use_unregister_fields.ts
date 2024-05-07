/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicatorType } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import deepmerge from 'deepmerge';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useFetchApmIndex } from '../../../hooks/use_fetch_apm_indices';
import {
  APM_AVAILABILITY_DEFAULT_VALUES,
  APM_LATENCY_DEFAULT_VALUES,
  BUDGETING_METHOD_OPTIONS,
  CUSTOM_KQL_DEFAULT_VALUES,
  CUSTOM_METRIC_DEFAULT_VALUES,
  HISTOGRAM_DEFAULT_VALUES,
  SLO_EDIT_FORM_DEFAULT_VALUES,
  TIMESLICE_METRIC_DEFAULT_VALUES,
  SLO_EDIT_FORM_DEFAULT_VALUES_SYNTHETICS_AVAILABILITY,
} from '../constants';
import { CreateSLOForm } from '../types';

/**
 * This hook handles the unregistration of inputs when selecting another SLI indicator.
 * We could not use shouldUnregister on the controlled form fields because of a bug when submitting the form
 * which was unmounting the components and therefore unregistering the associated values.
 */
export function useUnregisterFields({ isEditMode }: { isEditMode: boolean }) {
  const { data: apmIndex } = useFetchApmIndex();
  const { watch, unregister, reset, resetField } = useFormContext<CreateSLOForm>();
  const [indicatorTypeState, setIndicatorTypeState] = useState<IndicatorType>(
    watch('indicator.type')
  );

  const indicatorType = watch('indicator.type');
  useEffect(() => {
    if (indicatorType !== indicatorTypeState && !isEditMode) {
      setIndicatorTypeState(indicatorType);
      unregister('indicator.params');
      switch (indicatorType) {
        case 'sli.metric.custom':
          reset(
            Object.assign({}, SLO_EDIT_FORM_DEFAULT_VALUES, {
              indicator: CUSTOM_METRIC_DEFAULT_VALUES,
            }),
            {
              keepDefaultValues: true,
            }
          );
          break;
        case 'sli.metric.timeslice':
          reset(
            Object.assign({}, SLO_EDIT_FORM_DEFAULT_VALUES, {
              budgetingMethod: BUDGETING_METHOD_OPTIONS[1].value,
              objective: {
                target: 99,
                timesliceTarget: 95,
                timesliceWindow: 1,
              },
              indicator: TIMESLICE_METRIC_DEFAULT_VALUES,
            }),
            {
              keepDefaultValues: true,
            }
          );
          break;
        case 'sli.kql.custom':
          reset(
            Object.assign({}, SLO_EDIT_FORM_DEFAULT_VALUES, {
              indicator: CUSTOM_KQL_DEFAULT_VALUES,
            }),
            {
              keepDefaultValues: true,
            }
          );
          break;
        case 'sli.histogram.custom':
          reset(
            Object.assign({}, SLO_EDIT_FORM_DEFAULT_VALUES, {
              indicator: HISTOGRAM_DEFAULT_VALUES,
            }),
            {
              keepDefaultValues: true,
            }
          );
          break;
        case 'sli.apm.transactionDuration':
          reset(
            Object.assign({}, SLO_EDIT_FORM_DEFAULT_VALUES, {
              indicator: deepmerge(APM_LATENCY_DEFAULT_VALUES, { params: { index: apmIndex } }),
            }),
            {
              keepDefaultValues: true,
            }
          );
          break;
        case 'sli.apm.transactionErrorRate':
          reset(
            Object.assign({}, SLO_EDIT_FORM_DEFAULT_VALUES, {
              indicator: deepmerge(APM_AVAILABILITY_DEFAULT_VALUES, {
                params: { index: apmIndex },
              }),
            }),
            {
              keepDefaultValues: true,
            }
          );
          break;
        case 'sli.synthetics.availability':
          reset(Object.assign({}, SLO_EDIT_FORM_DEFAULT_VALUES_SYNTHETICS_AVAILABILITY), {
            keepDefaultValues: true,
          });
          break;
        default:
          assertNever(indicatorType);
      }
    }
  }, [isEditMode, indicatorType, indicatorTypeState, unregister, reset, resetField, apmIndex]);
}
