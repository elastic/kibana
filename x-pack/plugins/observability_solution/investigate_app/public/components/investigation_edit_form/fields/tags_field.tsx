/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { InvestigationForm } from '../investigation_edit_form';

const I18N_TAGS_LABEL = i18n.translate(
  'xpack.investigateApp.investigationEditForm.span.tagsLabel',
  { defaultMessage: 'Tags' }
);

export function TagsField() {
  const { control, getFieldState } = useFormContext<InvestigationForm>();

  return (
    <EuiFormRow label={I18N_TAGS_LABEL} fullWidth isInvalid={getFieldState('tags').invalid}>
      <Controller
        control={control}
        name="tags"
        defaultValue={[]}
        rules={{ required: false }}
        render={({ field, fieldState }) => (
          <EuiComboBox
            {...field}
            aria-label={I18N_TAGS_LABEL}
            placeholder={I18N_TAGS_LABEL}
            fullWidth
            noSuggestions
            isInvalid={fieldState.invalid}
            isClearable
            options={[]}
            selectedOptions={generateTagOptions(field.value)}
            onChange={(selected) => {
              if (selected.length) {
                return field.onChange(selected.map((opts) => opts.value));
              }

              field.onChange([]);
            }}
            onCreateOption={(searchValue: string) => {
              const normalizedSearchValue = searchValue.trim().toLowerCase();
              if (!normalizedSearchValue) {
                return;
              }

              const values = field.value ?? [];
              const tagAlreadyExists = values.find(
                (tag) => tag.trim().toLowerCase() === normalizedSearchValue
              );

              if (!tagAlreadyExists) {
                field.onChange([...values, searchValue]);
              }
            }}
          />
        )}
      />
    </EuiFormRow>
  );
}

function generateTagOptions(tags: string[] = []) {
  return tags.map((tag) => ({
    label: tag,
    value: tag,
  }));
}
