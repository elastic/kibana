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

export function FillOptions() {
  const { control, watch } = useFormContext();
  const isOutside = watch('annotation.rect.fill') === 'outside';

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
          defaultValue=""
          name="annotation.style.rect.fill"
          control={control}
          render={({ field, fieldState }) => (
            <EuiButtonGroup
              buttonSize="compressed"
              isFullWidth={true}
              id="fillOptions"
              idSelected={field.value}
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
      {isOutside && (
        <EuiFormRow
          label={i18n.translate('xpack.observability.fillOptions.euiFormRow.positionLabel', {
            defaultMessage: 'Position',
          })}
          display="columnCompressed"
          fullWidth
        >
          <Controller
            defaultValue=""
            name="annotation.style.rect.position"
            control={control}
            render={({ field, fieldState }) => (
              <EuiButtonGroup
                buttonSize="compressed"
                isFullWidth={true}
                id="positionOptions"
                idSelected={field.value}
                onChange={(id) => {
                  field.onChange(id);
                }}
                options={positionOptions}
                legend={i18n.translate('xpack.observability.annotationForm.positionLabel.legend', {
                  defaultMessage: 'Position',
                })}
              />
            )}
          />
        </EuiFormRow>
      )}
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
const positionOptions = [
  {
    id: 'top',
    label: i18n.translate('xpack.observability.annotationForm.fillOptions.top', {
      defaultMessage: 'Top',
    }),
  },
  {
    id: 'bottom',
    label: i18n.translate('xpack.observability.annotationForm.fillOptions.bottom', {
      defaultMessage: 'Bottom',
    }),
  },
];
