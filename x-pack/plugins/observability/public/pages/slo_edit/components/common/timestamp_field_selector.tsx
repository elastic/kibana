/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  Field,
  useFetchIndexPatternFields,
} from '../../../../hooks/slo/use_fetch_index_pattern_fields';
import { createOptionsFromFields, Option } from '../../helpers/create_options';
import { CreateSLOForm } from '../../types';

interface Props {
  index?: string;
}
export function TimestampFieldSelector({ index }: Props) {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();
  const [options, setOptions] = useState<Option[]>([]);

  const { isLoading, data: indexFields = [] } = useFetchIndexPatternFields(index);
  const [timestampFields, setTimestampFields] = useState<Field[]>([]);

  useEffect(() => {
    if (indexFields.length > 0) {
      const indexFieldsTimestamp = indexFields.filter((field) => field.type === 'date');
      setTimestampFields(indexFieldsTimestamp);
      setOptions(createOptionsFromFields(indexFieldsTimestamp));
    }
  }, [indexFields]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.observability.slo.sloEdit.common.timestampField.label', {
        defaultMessage: 'Timestamp field',
      })}
      isInvalid={getFieldState('indicator.params.timestampField').invalid}
    >
      <Controller
        name="indicator.params.timestampField"
        defaultValue=""
        control={control}
        rules={{ required: true }}
        render={({ field: { ref, ...field }, fieldState }) => (
          <EuiComboBox
            {...field}
            async
            placeholder={i18n.translate(
              'xpack.observability.slo.sloEdit.common.timestampField.placeholder',
              { defaultMessage: 'Select a timestamp field' }
            )}
            aria-label={i18n.translate(
              'xpack.observability.slo.sloEdit.common.timestampField.placeholder',
              { defaultMessage: 'Select a timestamp field' }
            )}
            isClearable
            isDisabled={!index}
            isInvalid={fieldState.invalid}
            isLoading={!!index && isLoading}
            onChange={(selected: EuiComboBoxOptionOption[]) => {
              if (selected.length) {
                return field.onChange(selected[0].value);
              }

              field.onChange('');
            }}
            options={options}
            onSearchChange={(searchValue: string) => {
              setOptions(
                createOptionsFromFields(timestampFields, ({ value }) => value.includes(searchValue))
              );
            }}
            selectedOptions={
              !!index &&
              !!field.value &&
              timestampFields.some((timestampField) => timestampField.name === field.value)
                ? [{ value: field.value, label: field.value }]
                : []
            }
            singleSelection
          />
        )}
      />
    </EuiFormRow>
  );
}
