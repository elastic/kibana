/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldNumber,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { CreateCompositeSLOForm } from '../helpers/process_form_values';
import { maxWidth } from './composite_slo_form';

interface Props {
  isEditMode: boolean;
}

export function ObjectiveSection({ isEditMode }: Props) {
  const { control, getFieldState } = useFormContext<CreateCompositeSLOForm>();

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" style={{ maxWidth }}>
      <EuiFlexGrid direction="column" gutterSize="l" columns={3}>
        <EuiFlexItem>
          <EuiFormRow
            isInvalid={getFieldState('objective.target').invalid}
            label={
              <span>
                {i18n.translate('xpack.observability.slo.compositeSloForm.objective.label', {
                  defaultMessage: 'Target (%)',
                })}{' '}
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.observability.slo.compositeSloForm.objective.tooltip',
                    { defaultMessage: 'The target objective in percentage for the SLO.' }
                  )}
                  position="top"
                />
              </span>
            }
          >
            <Controller
              name="objective.target"
              control={control}
              rules={{
                required: true,
                min: 0.001,
                max: 99.999,
              }}
              render={({ field: { ref, ...field }, fieldState }) => (
                <EuiFieldNumber
                  {...field}
                  required
                  isInvalid={fieldState.invalid}
                  value={String(field.value)}
                  min={0.001}
                  max={99.999}
                  step={0.001}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiPanel>
  );
}
