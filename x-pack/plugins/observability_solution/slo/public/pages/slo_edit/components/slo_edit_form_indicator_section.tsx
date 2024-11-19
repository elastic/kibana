/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiPanel, EuiSelect, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { SLI_OPTIONS } from '../constants';
import { useUnregisterFields } from '../hooks/use_unregister_fields';
import { CreateSLOForm } from '../types';
import { ApmAvailabilityIndicatorTypeForm } from './apm_availability/apm_availability_indicator_type_form';
import { ApmLatencyIndicatorTypeForm } from './apm_latency/apm_latency_indicator_type_form';
import { SyntheticsAvailabilityIndicatorTypeForm } from './synthetics_availability/synthetics_availability_indicator_type_form';
import { CustomKqlIndicatorTypeForm } from './custom_kql/custom_kql_indicator_type_form';
import { CustomMetricIndicatorTypeForm } from './custom_metric/custom_metric_type_form';
import { HistogramIndicatorTypeForm } from './histogram/histogram_indicator_type_form';
import { maxWidth } from './slo_edit_form';
import { TimesliceMetricIndicatorTypeForm } from './timeslice_metric/timeslice_metric_indicator';

interface SloEditFormIndicatorSectionProps {
  isEditMode: boolean;
}

export function SloEditFormIndicatorSection({ isEditMode }: SloEditFormIndicatorSectionProps) {
  const { control, watch } = useFormContext<CreateSLOForm>();
  useUnregisterFields({ isEditMode });

  const indicatorType = watch('indicator.type');

  const indicatorTypeForm = useMemo(() => {
    switch (indicatorType) {
      case 'sli.kql.custom':
        return <CustomKqlIndicatorTypeForm />;
      case 'sli.apm.transactionDuration':
        return <ApmLatencyIndicatorTypeForm />;
      case 'sli.apm.transactionErrorRate':
        return <ApmAvailabilityIndicatorTypeForm />;
      case 'sli.synthetics.availability':
        return <SyntheticsAvailabilityIndicatorTypeForm />;
      case 'sli.metric.custom':
        return <CustomMetricIndicatorTypeForm />;
      case 'sli.histogram.custom':
        return <HistogramIndicatorTypeForm />;
      case 'sli.metric.timeslice':
        return <TimesliceMetricIndicatorTypeForm />;
      default:
        return null;
    }
  }, [indicatorType]);

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
          <EuiFormRow label={indicatorLabel}>
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
                  aria-label={indicatorLabel}
                />
              )}
            />
          </EuiFormRow>
          <EuiSpacer size="xxl" />
        </>
      )}
      {indicatorTypeForm}
    </EuiPanel>
  );
}

const indicatorLabel = i18n.translate('xpack.slo.sloEdit.definition.sliType', {
  defaultMessage: 'Choose the SLI type',
});
