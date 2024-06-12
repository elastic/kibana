/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiFormControlLayout, EuiFormLabel, EuiDatePicker } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import React from 'react';
import { CreateAnnotationForm } from './create_annotation';

export function AnnotationRange() {
  const { control, watch } = useFormContext<CreateAnnotationForm>();

  const timestampEnd = watch('@timestampEnd');

  if (timestampEnd) {
    return (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.observability.annotationForm.euiFormRow.date', {
            defaultMessage: 'Timestamp',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiFormControlLayout
            fullWidth
            compressed
            prepend={
              <EuiFormLabel>
                {i18n.translate('xpack.observability.annotationRange.fromFormLabelLabel', {
                  defaultMessage: 'From',
                })}
              </EuiFormLabel>
            }
          >
            <Controller
              name="@timestamp"
              control={control}
              rules={{
                required: true,
              }}
              render={({ field }) => {
                const { value, ref, ...rest } = field;
                return (
                  <EuiDatePicker
                    showTimeSelect
                    selected={field.value}
                    compressed
                    dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
                    {...rest}
                  />
                );
              }}
            />
          </EuiFormControlLayout>
        </EuiFormRow>
        <EuiFormRow display="rowCompressed" fullWidth>
          <EuiFormControlLayout
            fullWidth
            compressed
            prepend={
              <EuiFormLabel>
                {i18n.translate('xpack.observability.annotationRange.toFormLabelLabel', {
                  defaultMessage: 'To',
                })}
              </EuiFormLabel>
            }
          >
            <Controller
              name="@timestampEnd"
              control={control}
              rules={{
                required: true,
              }}
              render={({ field }) => {
                const { value, ref, ...rest } = field;
                return (
                  <EuiDatePicker
                    showTimeSelect
                    selected={field.value}
                    compressed
                    dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
                    {...rest}
                  />
                );
              }}
            />
          </EuiFormControlLayout>
        </EuiFormRow>
      </>
    );
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.observability.annotationForm.euiFormRow.annotationDate', {
        defaultMessage: 'Annotation date',
      })}
    >
      <Controller
        name="@timestamp"
        control={control}
        rules={{
          required: true,
        }}
        render={({ field }) => {
          const { value, ref, ...rest } = field;
          return (
            <EuiDatePicker
              showTimeSelect
              selected={field.value}
              compressed
              dateFormat="MMM D, YYYY @ HH:mm:ss.SSS"
              {...rest}
            />
          );
        }}
      />
    </EuiFormRow>
  );
}
