/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import React from 'react';

export function TextDecoration() {
  const { control } = useFormContext();

  return (
    <EuiFormRow
      label={i18n.translate('xpack.observability.annotationForm.euiFormRow.textDecoration', {
        defaultMessage: 'Text decoration',
      })}
      display="columnCompressed"
      fullWidth
    >
      <Controller
        name="annotation.style.line.textDecoration"
        control={control}
        render={({ field }) => (
          <EuiButtonGroup
            buttonSize="compressed"
            isFullWidth={true}
            id="positionOptions"
            idSelected={field.value}
            onChange={(id) => {
              field.onChange(id);
            }}
            options={textOptions}
            legend={i18n.translate(
              'xpack.observability.annotationForm.positionLabel.textDecoration',
              {
                defaultMessage: 'Text decoration',
              }
            )}
          />
        )}
      />
    </EuiFormRow>
  );
}

const textOptions = [
  {
    id: 'none',
    label: i18n.translate('xpack.observability.annotationForm.decoration.none', {
      defaultMessage: 'None',
    }),
  },
  {
    id: 'name',
    label: i18n.translate('xpack.observability.annotationForm.decoration.name', {
      defaultMessage: 'Name',
    }),
  },
];
