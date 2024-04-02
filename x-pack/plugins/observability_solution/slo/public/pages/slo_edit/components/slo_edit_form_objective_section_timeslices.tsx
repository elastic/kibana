/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFlexItem, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { CreateSLOForm } from '../types';

export function SloEditFormObjectiveSectionTimeslices() {
  const { control, getFieldState, watch } = useFormContext<CreateSLOForm>();
  const indicator = watch('indicator.type');

  return (
    <>
      <EuiFlexItem>
        <EuiFormRow
          isInvalid={getFieldState('objective.timesliceTarget').invalid}
          label={
            <span>
              {i18n.translate('xpack.slo.sloEdit.timeSliceTarget.label', {
                defaultMessage: 'Timeslice target (%)',
              })}{' '}
              <EuiIconTip
                content={i18n.translate('xpack.slo.sloEdit.timeSliceTarget.tooltip', {
                  defaultMessage:
                    'The individual time slices target used to determine whether the slice is good or bad.',
                })}
                position="top"
              />
            </span>
          }
        >
          <Controller
            name="objective.timesliceTarget"
            control={control}
            defaultValue={95}
            rules={{
              required: true,
              min: 0.001,
              max: 99.999,
            }}
            render={({ field: { ref, onChange, ...field }, fieldState }) => (
              <EuiFieldNumber
                {...field}
                required
                disabled={indicator === 'sli.metric.timeslice'}
                isInvalid={fieldState.invalid}
                value={field.value}
                data-test-subj="sloFormObjectiveTimesliceTargetInput"
                min={0.001}
                max={99.999}
                step={0.001}
                onChange={(event) => onChange(event.target.value)}
              />
            )}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormRow
          isInvalid={getFieldState('objective.timesliceWindow').invalid}
          label={
            <span>
              {i18n.translate('xpack.slo.sloEdit.timesliceWindow.label', {
                defaultMessage: 'Timeslice window (in minutes)',
              })}{' '}
              <EuiIconTip
                content={i18n.translate('xpack.slo.sloEdit.timesliceWindow.tooltip', {
                  defaultMessage: 'The time slice window size used to evaluate the data from.',
                })}
                position="top"
              />
            </span>
          }
        >
          <Controller
            name="objective.timesliceWindow"
            defaultValue="1"
            control={control}
            rules={{ required: true, min: 1, max: 120 }}
            render={({ field: { ref, onChange, ...field }, fieldState }) => (
              <EuiFieldNumber
                {...field}
                isInvalid={fieldState.invalid}
                required
                data-test-subj="sloFormObjectiveTimesliceWindowInput"
                value={field.value}
                min={1}
                max={120}
                step={1}
                onChange={(event) => onChange(String(parseInt(event.target.value, 10)))}
              />
            )}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </>
  );
}
