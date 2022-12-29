/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldNumber, EuiFlexGrid, EuiFlexItem, EuiFormLabel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Control, Controller } from 'react-hook-form';

import type { CreateSLOParamsForFE } from '../../../typings';

export interface SloEditFormObjectivesTimeslicesProps {
  control: Control<CreateSLOParamsForFE>;
}

export function SloEditFormObjectivesTimeslices({ control }: SloEditFormObjectivesTimeslicesProps) {
  return (
    <EuiFlexGrid columns={3}>
      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.objectives.timeSliceTarget', {
            defaultMessage: 'Timeslice target (%)',
          })}
        </EuiFormLabel>
        <Controller
          name="objective.timesliceTarget"
          shouldUnregister
          control={control}
          rules={{
            required: true,
            min: 0.0001,
            max: 100,
          }}
          render={({ field }) => (
            <EuiFieldNumber
              {...field}
              min={0}
              max={100}
              step={0.0001}
              onChange={(event) => field.onChange(Number(event.target.value))}
            />
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFormLabel>
          {i18n.translate('xpack.observability.slos.sloEdit.objectives.timesliceWindow', {
            defaultMessage: 'Timeslice window (minutes)',
          })}
        </EuiFormLabel>

        <Controller
          name="objective.timesliceWindow"
          shouldUnregister
          control={control}
          rules={{ required: true, min: 1, max: 120 }}
          render={({ field }) => (
            <EuiFieldNumber
              {...field}
              min={1}
              max={120}
              step={1}
              onChange={(event) => field.onChange(String(event.target.value))}
            />
          )}
        />
      </EuiFlexItem>
    </EuiFlexGrid>
  );
}
