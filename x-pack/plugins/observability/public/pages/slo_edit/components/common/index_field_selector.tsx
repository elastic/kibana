/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { createOptionsFromFields, Option } from '../../helpers/create_options';
import { CreateSLOForm } from '../../types';

interface Props {
  indexFields: FieldSpec[];
  name: 'groupBy' | 'indicator.params.timestampField';
  label: React.ReactNode | string;
  placeholder: string;
  isDisabled: boolean;
  isLoading: boolean;
  isRequired?: boolean;
  defaultValue?: string;
}
export function IndexFieldSelector({
  indexFields,
  name,
  label,
  placeholder,
  isDisabled,
  isLoading,
  isRequired = false,
  defaultValue = '',
}: Props) {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();
  const [options, setOptions] = useState<Option[]>(createOptionsFromFields(indexFields));

  useEffect(() => {
    setOptions(createOptionsFromFields(indexFields));
  }, [indexFields]);

  return (
    <EuiFlexItem>
      <EuiFormRow label={label} isInvalid={getFieldState(name).invalid}>
        <Controller
          defaultValue={defaultValue}
          name={name}
          control={control}
          rules={{ required: isRequired && !isDisabled }}
          render={({ field, fieldState }) => (
            <EuiComboBox<string>
              {...field}
              async
              placeholder={placeholder}
              aria-label={placeholder}
              isClearable
              isDisabled={isLoading || isDisabled}
              isInvalid={fieldState.invalid}
              isLoading={isLoading}
              onChange={(selected: EuiComboBoxOptionOption[]) => {
                if (selected.length) {
                  return field.onChange(selected[0].value);
                }

                field.onChange(defaultValue);
              }}
              options={options}
              onSearchChange={(searchValue: string) => {
                setOptions(
                  createOptionsFromFields(indexFields, ({ value }) => value.includes(searchValue))
                );
              }}
              selectedOptions={
                !!indexFields &&
                !!field.value &&
                indexFields.some((indexField) => indexField.name === field.value)
                  ? [{ value: field.value, label: field.value }]
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
