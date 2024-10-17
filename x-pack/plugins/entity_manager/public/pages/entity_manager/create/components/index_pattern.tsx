/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { EntityDefinition } from '@kbn/entities-schema';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetchIndices } from '../../../../hooks/use_fetch_indices';

export function IndexPatternInput() {
  const { control, watch } = useFormContext<EntityDefinition>();
  const [options, setOptions] = useState<string[]>([]);
  const indexPatterns = watch('indexPatterns');
  const { data } = useFetchIndices({ indexPatterns });
  const indexCount = data != null ? data.length : 0;

  const helpText = indexPatterns.length
    ? i18n.translate('xpack.entityManager.indexPatternInput.helpText', {
        defaultMessage:
          'Matches {indexCount, number} {indexCount, plural, one {index} other {indices}}.',
        values: { indexCount },
      })
    : null;

  return (
    <Controller
      name="indexPatterns"
      rules={{ required: true }}
      defaultValue={[]}
      control={control}
      render={({ field: { ref, ...field }, fieldState }) => (
        <EuiFormRow label="Index patterns" helpText={helpText}>
          <EuiComboBox
            {...field}
            isClearable={true}
            placeholder="Enter multiple index patterns"
            isInvalid={fieldState.invalid}
            onChange={(selected: EuiComboBoxOptionOption[]) => {
              if (selected.length) {
                return field.onChange(selected.map((selection) => selection.value));
              }
              field.onChange([]);
            }}
            onCreateOption={(newValue: string, existingOptions: EuiComboBoxOptionOption[]) => {
              const normalizedValue = newValue.trim();
              const alreadyExists = field.value.some((v) => v === normalizedValue);
              const optionAlreadyExists = options.some((v) => v === normalizedValue);
              if (!normalizedValue || (alreadyExists && optionAlreadyExists)) {
                return;
              }
              if (!alreadyExists) {
                field.onChange([...field.value, normalizedValue]);
              }
              if (!optionAlreadyExists) {
                setOptions((previous) => [...previous, normalizedValue]);
              }
            }}
            options={options.map((value) => ({ value, label: value }))}
            selectedOptions={field.value.map((value) => ({ value, label: value }))}
          />
        </EuiFormRow>
      )}
    />
  );
}
