/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiPanel, EuiSelect, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CreateSLOInput } from '@kbn/slo-schema';
import React, { useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { SLI_OPTIONS } from '../constants';
import { ApmAvailabilityIndicatorTypeForm } from './apm_availability/apm_availability_indicator_type_form';
import { ApmLatencyIndicatorTypeForm } from './apm_latency/apm_latency_indicator_type_form';
import { CustomKqlIndicatorTypeForm } from './custom_kql/custom_kql_indicator_type_form';
import {
  CustomMetricIndicatorTypeForm,
  NEW_CUSTOM_METRIC,
} from './custom_metric/custom_metric_type_form';
import { maxWidth } from './slo_edit_form';

interface SloEditFormIndicatorSectionProps {
  isEditMode: boolean;
}

export function SloEditFormIndicatorSection({ isEditMode }: SloEditFormIndicatorSectionProps) {
  const { control, watch, setValue } = useFormContext<CreateSLOInput>();

  const indicator = watch('indicator.type');

  useEffect(() => {
    if (!isEditMode) {
      if (indicator === 'sli.metric.custom') {
        setValue('indicator.params.index', '');
        setValue('indicator.params.timestampField', '');
        setValue('indicator.params.good.equation', 'A');
        setValue('indicator.params.good.metrics', [NEW_CUSTOM_METRIC]);
        setValue('indicator.params.total.equation', 'A');
        setValue('indicator.params.total.metrics', [NEW_CUSTOM_METRIC]);
      }
      if (indicator === 'sli.kql.custom') {
        setValue('indicator.params.index', '');
        setValue('indicator.params.timestampField', '');
        setValue('indicator.params.good', '');
        setValue('indicator.params.total', '');
      }
    }
  }, [indicator, setValue, isEditMode]);

  const getIndicatorTypeForm = () => {
    switch (watch('indicator.type')) {
      case 'sli.kql.custom':
        return <CustomKqlIndicatorTypeForm />;
      case 'sli.apm.transactionDuration':
        return <ApmLatencyIndicatorTypeForm />;
      case 'sli.apm.transactionErrorRate':
        return <ApmAvailabilityIndicatorTypeForm />;
      case 'sli.metric.custom':
        return <CustomMetricIndicatorTypeForm />;
      default:
        return null;
    }
  };

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      style={{ maxWidth }}
      data-test-subj="sloEditFormIndicatorSection"
    >
      {!isEditMode && (
        <>
          <EuiFormRow
            label={i18n.translate('xpack.observability.slo.sloEdit.definition.sliType', {
              defaultMessage: 'Choose the SLI type',
            })}
          >
            <Controller
              name="indicator.type"
              control={control}
              rules={{ required: true }}
              render={({ field: { ref, ...field } }) => (
                <EuiSelect
                  {...field}
                  required
                  data-test-subj="sloFormIndicatorTypeSelect"
                  options={SLI_OPTIONS}
                />
              )}
            />
          </EuiFormRow>
          <EuiSpacer size="xxl" />
        </>
      )}
      {getIndicatorTypeForm()}
    </EuiPanel>
  );
}
