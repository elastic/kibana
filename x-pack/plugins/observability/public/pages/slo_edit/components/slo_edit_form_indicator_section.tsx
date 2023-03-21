/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormLabel, EuiPanel, EuiSelect, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CreateSLOInput } from '@kbn/slo-schema';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { SLI_OPTIONS } from '../constants';
import { ApmAvailabilityIndicatorTypeForm } from './apm_availability/apm_availability_indicator_type_form';
import { ApmLatencyIndicatorTypeForm } from './apm_latency/apm_latency_indicator_type_form';
import { CustomKqlIndicatorTypeForm } from './custom_kql/custom_kql_indicator_type_form';
import { maxWidth } from './slo_edit_form';

export function SloEditFormIndicatorSection() {
  const { control, watch } = useFormContext<CreateSLOInput>();

  const getIndicatorTypeForm = () => {
    switch (watch('indicator.type')) {
      case 'sli.kql.custom':
        return <CustomKqlIndicatorTypeForm />;
      case 'sli.apm.transactionDuration':
        return <ApmLatencyIndicatorTypeForm />;
      case 'sli.apm.transactionErrorRate':
        return <ApmAvailabilityIndicatorTypeForm />;
      default:
        return null;
    }
  };

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" style={{ maxWidth }}>
      <EuiTitle>
        <h2>
          {i18n.translate('xpack.observability.slo.sloEdit.definition.title', {
            defaultMessage: 'Define SLI',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="xl" />

      <EuiFormLabel>
        {i18n.translate('xpack.observability.slo.sloEdit.definition.sliType', {
          defaultMessage: 'Choose the SLI type',
        })}
      </EuiFormLabel>

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

      <EuiSpacer size="xxl" />

      {getIndicatorTypeForm()}

      <EuiSpacer size="m" />
    </EuiPanel>
  );
}
