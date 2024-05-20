/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode, useState } from 'react';
import { omit } from 'lodash';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, SyntheticsAvailabilityIndicator } from '@kbn/slo-schema';
import { debounce } from 'lodash';
import { Controller, FieldPath, useFormContext } from 'react-hook-form';
import { OptionalText } from '../common/optional_text';
import {
  useFetchSyntheticsSuggestions,
  Suggestion,
} from '../../../../hooks/use_fetch_synthetics_suggestions';
import { CreateSLOForm } from '../../types';

interface Option {
  label: string;
  value: string;
}

export interface Props {
  allowAllOption?: boolean;
  dataTestSubj: string;
  fieldName: 'monitorIds' | 'projects' | 'tags' | 'locations';
  label: string;
  name: FieldPath<CreateSLOForm<SyntheticsAvailabilityIndicator>>;
  placeholder: string;
  tooltip?: ReactNode;
  suggestions?: Suggestion[];
  isLoading?: boolean;
  required?: boolean;
  filters: Record<string, string[]>;
}

export function FieldSelector({
  allowAllOption = true,
  dataTestSubj,
  fieldName,
  label,
  name,
  placeholder,
  tooltip,
  required,
  filters,
}: Props) {
  const { control, getFieldState } =
    useFormContext<CreateSLOForm<SyntheticsAvailabilityIndicator>>();
  const [search, setSearch] = useState<string>('');

  const { suggestions = [], isLoading } = useFetchSyntheticsSuggestions({
    filters: omit(filters, fieldName),
    search,
    fieldName,
  });

  const debouncedSearch = debounce((value) => setSearch(value), 200);

  const ALL_VALUE_OPTION = {
    value: ALL_VALUE,
    label: i18n.translate('xpack.slo.fieldSelector.all', { defaultMessage: 'All' }),
  };

  const options = (allowAllOption ? [ALL_VALUE_OPTION] : []).concat(createOptions(suggestions));

  return (
    <EuiFlexItem>
      <EuiFormRow
        label={
          !!tooltip ? (
            <span>
              {label} {tooltip}
            </span>
          ) : (
            label
          )
        }
        isInvalid={getFieldState(name).invalid}
        fullWidth
        labelAppend={!required ? <OptionalText /> : undefined}
      >
        <Controller
          defaultValue=""
          name={name}
          control={control}
          rules={{ required }}
          render={({ field, fieldState }) => (
            <EuiComboBox
              {...field}
              aria-label={placeholder}
              async
              data-test-subj={dataTestSubj}
              isClearable
              fullWidth
              isInvalid={fieldState.invalid}
              isLoading={isLoading}
              onChange={(selected: EuiComboBoxOptionOption[]) => {
                // removes ALL value option if a specific value is selected
                if (selected.length && selected.at(-1)?.value !== ALL_VALUE) {
                  field.onChange(selected.filter((value) => value.value !== ALL_VALUE));
                  return;
                }
                // removes specific value if ALL value is selected
                if (selected.length && selected.at(-1)?.value === ALL_VALUE) {
                  field.onChange([ALL_VALUE_OPTION]);
                  return;
                }

                field.onChange([]);
              }}
              onSearchChange={(value: string) => debouncedSearch(value)}
              options={options}
              placeholder={placeholder}
              selectedOptions={
                !!Array.isArray(field.value) && field.value.length
                  ? (field.value as Array<{ value: string; label: string }>).map((value) => ({
                      value: value.value,
                      label: value.label,
                      'data-test-subj': `${dataTestSubj}SelectedValue`,
                    }))
                  : []
              }
            />
          )}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
}

function createOptions(suggestions: Suggestion[] = []): Option[] {
  return suggestions
    .map((suggestion) => ({ label: suggestion.label, value: suggestion.value }))
    .sort((a, b) => String(a.label).localeCompare(b.label));
}
