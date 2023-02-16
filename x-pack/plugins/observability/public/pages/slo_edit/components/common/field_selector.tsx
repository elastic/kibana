/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFlexItem, EuiFormLabel } from '@elastic/eui';
import { Control, Controller, FieldPath } from 'react-hook-form';
import { CreateSLOInput } from '@kbn/slo-schema';
import { i18n } from '@kbn/i18n';
import {
  Suggestion,
  useFetchApmSuggestions,
} from '../../../../hooks/slo/use_fetch_apm_suggestions';

interface Option {
  label: string;
  value: string;
}

export interface Props {
  allowAllOption?: boolean;
  control: Control<CreateSLOInput>;
  dataTestSubj: string;
  fieldName: string;
  label: string;
  name: FieldPath<CreateSLOInput>;
  placeholder: string;
}

export function FieldSelector({
  allowAllOption = true,
  control,
  dataTestSubj,
  fieldName,
  label,
  name,
  placeholder,
}: Props) {
  const [search, setSearch] = useState<string>('');
  const { data: suggestions, loading } = useFetchApmSuggestions({
    fieldName,
    search,
  });
  const [options, setOptions] = useState<Option[]>([]);

  useEffect(() => {
    const opts = (
      allowAllOption
        ? [
            {
              value: '*',
              label: i18n.translate('xpack.observability.slos.sloEdit.fieldSelector.all', {
                defaultMessage: 'All',
              }),
            },
          ]
        : []
    ).concat(createOptions(suggestions));

    setOptions(opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions.length]);

  return (
    <EuiFlexItem>
      <EuiFormLabel>{label}</EuiFormLabel>

      <Controller
        shouldUnregister={true}
        defaultValue=""
        name={name}
        control={control}
        rules={{ required: true }}
        render={({ field, fieldState }) => (
          <EuiComboBox
            {...field}
            aria-label={placeholder}
            async
            data-test-subj={dataTestSubj}
            isClearable={true}
            isInvalid={!!fieldState.error}
            isLoading={loading}
            onChange={(selected: EuiComboBoxOptionOption[]) => {
              if (selected.length) {
                return field.onChange(selected[0].value);
              }

              field.onChange('');
            }}
            onSearchChange={(value: string) => {
              setSearch(value);
            }}
            options={options}
            placeholder={placeholder}
            selectedOptions={
              !!field.value && typeof field.value === 'string'
                ? [
                    {
                      value: field.value,
                      label: field.value,
                      'data-test-subj': `${dataTestSubj}SelectedValue`,
                    },
                  ]
                : []
            }
            singleSelection
          />
        )}
      />
    </EuiFlexItem>
  );
}

function createOptions(suggestions: Suggestion[]): Option[] {
  return suggestions
    .map((suggestion) => ({ label: suggestion, value: suggestion }))
    .sort((a, b) => String(a.label).localeCompare(b.label));
}
