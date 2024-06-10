/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiFormControlLayout, EuiFormLabel, EuiDatePicker } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import React, { useEffect } from 'react';

export function AnnotationRange() {
  const { control, watch, setValue } = useFormContext();

  const annotationType = watch('annotation.type');
  const timestampStart = watch('@timestamp');
  const timestampEnd = watch('@timestampEnd');

  useEffect(() => {
    if (annotationType === 'range' && !timestampEnd && timestampStart) {
      setValue('@timestampEnd', timestampStart);
    }
  }, [annotationType, setValue, timestampEnd, timestampStart]);

  if (annotationType === 'range') {
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
              defaultValue=""
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
              defaultValue=""
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
        defaultValue=""
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
