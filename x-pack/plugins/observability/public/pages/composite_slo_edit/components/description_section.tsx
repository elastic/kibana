/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { CreateCompositeSLOForm } from '../helpers/process_form_values';

import { maxWidth } from './composite_slo_form';

interface Props {
  isEditMode: boolean;
}

export function DescriptionSection({ isEditMode }: Props) {
  const { control, getFieldState } = useFormContext<CreateCompositeSLOForm>();

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none" style={{ maxWidth }}>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            isInvalid={getFieldState('name').invalid}
            label={i18n.translate('xpack.observability.slo.compositeSloForm.description.name', {
              defaultMessage: 'Composite SLO name',
            })}
          >
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field: { ref, ...field }, fieldState }) => (
                <EuiFieldText
                  {...field}
                  fullWidth
                  isInvalid={fieldState.invalid}
                  placeholder={i18n.translate(
                    'xpack.observability.slo.compositeSloForm.description.namePlaceholder',
                    { defaultMessage: 'Name for the composite SLO' }
                  )}
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
