/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE } from '@kbn/slo-schema';
import { debounce } from 'lodash';
import React, { ReactNode, useState } from 'react';
import { Controller, FieldPath, useFormContext } from 'react-hook-form';
import { Suggestion, useFetchApmSuggestions } from '../../../../hooks/use_fetch_apm_suggestions';
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
  name: FieldPath<CreateSLOForm>;
  placeholder: string;
  tooltip?: ReactNode;
}

export function FieldSelector({
  allowAllOption = true,
  dataTestSubj,
  fieldName,
  label,
  name,
  placeholder,
  tooltip,
}: Props) {
  const { control, watch, getFieldState } = useFormContext<CreateSLOForm>();
  const serviceName = watch('indicator.params.service');
  const [search, setSearch] = useState<string>('');
  const { suggestions, isLoading } = useFetchApmSuggestions({
    fieldName,
    search,
    serviceName,
  });

  const debouncedSearch = debounce((value) => setSearch(value), 200);

  const options = (
    allowAllOption
      ? [
          {
            value: ALL_VALUE,
            label: i18n.translate('xpack.slo.sloEdit.fieldSelector.all', {
              defaultMessage: 'All',
            }),
          },
        ]
      : []
  ).concat(createOptions(suggestions));

  const isDisabled = name !== 'indicator.params.service' && !serviceName;

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
          rules={{ required: !isDisabled }}
          render={({ field, fieldState }) => (
            <EuiComboBox
              {...field}
              aria-label={placeholder}
              async
              data-test-subj={dataTestSubj}
              isClearable
              isDisabled={isDisabled}
              isInvalid={fieldState.invalid}
              isLoading={isLoading}
              onChange={(selected: EuiComboBoxOptionOption[]) => {
                if (selected.length) {
                  return field.onChange(selected[0].value);
                }

                field.onChange('');
              }}
              onSearchChange={(value: string) => debouncedSearch(value)}
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
      </EuiFormRow>
    </EuiFlexItem>
  );
}

function createOptions(suggestions: Suggestion[]): Option[] {
  return suggestions
    .map((suggestion) => ({ label: suggestion, value: suggestion }))
    .sort((a, b) => String(a.label).localeCompare(b.label));
}
