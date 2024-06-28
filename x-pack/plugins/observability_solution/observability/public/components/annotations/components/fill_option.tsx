/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import { CreateAnnotationParams } from '../../../../common/annotations';

export function FillOptions() {
  const { control } = useFormContext<CreateAnnotationParams>();

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.observability.annotationForm.fillOptions.legend', {
          defaultMessage: 'Fill',
        })}
        display="columnCompressed"
        fullWidth
      >
        <Controller
          defaultValue="inside"
          name="annotation.style.rect.fill"
          control={control}
          render={({ field }) => (
            <EuiButtonGroup
              buttonSize="compressed"
              isFullWidth={true}
              id="fillOptions"
              idSelected={field.value as string}
              onChange={(id) => {
                field.onChange(id);
              }}
              options={options}
              legend={i18n.translate('xpack.observability.annotationForm.fillOptions.legend', {
                defaultMessage: 'Fill',
              })}
            />
          )}
        />
      </EuiFormRow>
    </>
  );
}

const options = [
  {
    id: 'inside',
    label: i18n.translate('xpack.observability.annotationForm.fillOptions.inside', {
      defaultMessage: 'Inside',
    }),
  },
  {
    id: 'outside',
    label: i18n.translate('xpack.observability.annotationForm.fillOptions.outside', {
      defaultMessage: 'Outside',
    }),
  },
];
