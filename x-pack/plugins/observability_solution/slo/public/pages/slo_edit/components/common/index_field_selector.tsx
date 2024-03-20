/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import React, { useEffect, useState, ReactNode } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import { createOptionsFromFields, Option } from '../../helpers/create_options';
import { CreateSLOForm } from '../../types';

interface Props {
  indexFields: FieldSpec[];
  name: 'groupBy' | 'indicator.params.timestampField';
  label: ReactNode | string;
  placeholder: string;
  isDisabled: boolean;
  isLoading: boolean;
  isRequired?: boolean;
  defaultValue?: string;
  labelAppend?: ReactNode;
}
export function IndexFieldSelector({
  indexFields,
  name,
  label,
  labelAppend,
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

  const getSelectedItems = (value: string | string[], fields: FieldSpec[]) => {
    const values = [value].flat();
    const selectedItems: Array<EuiComboBoxOptionOption<string>> = [];
    fields.forEach((field) => {
      if (values.includes(field.name)) {
        selectedItems.push({ value: field.name, label: field.name });
      }
    });
    return selectedItems;
  };

  return (
    <EuiFlexItem>
      <EuiFormRow label={label} isInvalid={getFieldState(name).invalid} labelAppend={labelAppend}>
        <Controller
          defaultValue={[defaultValue].flat()}
          name={name}
          control={control}
          rules={{ required: isRequired && !isDisabled }}
          render={({ field, fieldState }) => {
            return (
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
                    return field.onChange(selected.map((selection) => selection.value));
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
                  !!indexFields && !!field.value ? getSelectedItems(field.value, indexFields) : []
                }
              />
            );
          }}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
}
