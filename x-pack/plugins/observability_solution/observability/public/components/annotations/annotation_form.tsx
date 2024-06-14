/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm, EuiFormRow, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { CreateAnnotationForm } from './components/create_annotation';
import { AnnotationApplyTo } from './components/annotation_apply_to';
import { Annotation } from '../../../common/annotations';
import { ComboBox, FieldText, Switch, TextArea } from './components/forward_refs';
import { AnnotationRange } from './components/annotation_range';
import { AnnotationAppearance } from './annotation_apearance';

export function AnnotationForm({ editAnnotation }: { editAnnotation?: Annotation | null }) {
  const { control, formState, watch } = useFormContext<CreateAnnotationForm>();

  const timestampStart = watch('@timestamp');

  return (
    <EuiForm id="annotationForm" component="form">
      <AnnotationRange />
      <EuiSpacer size="s" />
      <Controller
        name="@timestampEnd"
        control={control}
        render={({ field: { value, ...field } }) => (
          <Switch
            {...field}
            label={i18n.translate(
              'xpack.observability.annotationForm.euiFormRow.applyAsRangeLabel',
              {
                defaultMessage: 'Apply as range',
              }
            )}
            checked={Boolean(value)}
            onChange={(evt) => {
              field.onChange(evt.target.checked ? timestampStart : null);
            }}
            compressed
          />
        )}
      />
      <EuiHorizontalRule margin="s" />
      <EuiFormRow
        label={i18n.translate('xpack.observability.annotationForm.euiFormRow.nameLabel', {
          defaultMessage: 'Name',
        })}
        display="columnCompressed"
        fullWidth
        error={formState.errors.name?.message}
        isInvalid={Boolean(formState.errors.name?.message)}
      >
        <Controller
          defaultValue=""
          name="name"
          control={control}
          rules={{
            required: 'Name is required',
          }}
          render={({ field, fieldState }) => (
            <FieldText {...field} isInvalid={fieldState.invalid} compressed />
          )}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.observability.annotationForm.euiFormRow.messageLabel', {
          defaultMessage: 'Message',
        })}
        display="columnCompressed"
        fullWidth
        error={formState.errors.message?.message}
        isInvalid={Boolean(formState.errors.message?.message)}
      >
        <Controller
          defaultValue=""
          name="message"
          control={control}
          render={({ field, fieldState }) => (
            <TextArea {...field} rows={3} isInvalid={fieldState.invalid} compressed />
          )}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.observability.annotationForm.euiFormRow.tagsLabel', {
          defaultMessage: 'Tags',
        })}
        display="columnCompressed"
        fullWidth
      >
        <Controller
          defaultValue={[]}
          name="tags"
          control={control}
          render={({ field }) => (
            <ComboBox
              {...field}
              options={field.value?.map((tag) => ({ label: tag }))}
              selectedOptions={field.value?.map((tag) => ({ label: tag }))}
              onChange={(val) => {
                field.onChange(val.map((option) => option.label));
              }}
              onCreateOption={(searchValue) => {
                field.onChange([...(field.value ?? []), searchValue]);
              }}
              isClearable={true}
              compressed
            />
          )}
        />
      </EuiFormRow>
      <EuiHorizontalRule margin="s" />
      <AnnotationAppearance />
      <EuiHorizontalRule margin="s" />
      <AnnotationApplyTo editAnnotation={editAnnotation} />
    </EuiForm>
  );
}
