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
import {
  useFetchSyntheticsSuggestions,
  Suggestion,
} from '../../../../hooks/slo/use_fetch_synthetics_suggestions';
import { CreateSLOForm } from '../../types';

interface Option {
  label: string;
  value: string;
}

export interface Props {
  allowAllOption?: boolean;
  dataTestSubj: string;
  fieldName: string;
  label: string;
  name: FieldPath<CreateSLOForm<SyntheticsAvailabilityIndicator>>;
  placeholder: string;
  tooltip?: ReactNode;
  suggestions?: Suggestion[];
  isLoading?: boolean;
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
  filters,
}: Props) {
  const { control, watch, getFieldState } =
    useFormContext<CreateSLOForm<SyntheticsAvailabilityIndicator>>();
  // const monitorId = watch('indicator.params.monitorIds');
  // const fieldValue = watch(`indicator.params.${fieldName}`);

  const { suggestions = {}, isLoading } = useFetchSyntheticsSuggestions({
    filters: omit(filters, fieldName),
  });

  const [search, setSearch] = useState<string>('');

  const debouncedSearch = debounce((value) => setSearch(value), 200);

  const options = (
    allowAllOption
      ? [
          {
            value: ALL_VALUE,
            label: i18n.translate('xpack.observability.slo.sloEdit.fieldSelector.all', {
              defaultMessage: 'All',
            }),
          },
        ]
      : []
  ).concat(createOptions(suggestions[fieldName]));

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
      >
        <Controller
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
              isClearable
              isInvalid={fieldState.invalid}
              isLoading={isLoading}
              onChange={(selected: EuiComboBoxOptionOption[]) => {
                if (selected.length) {
                  field.onChange(selected);
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
