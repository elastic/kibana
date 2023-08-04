/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE } from '@kbn/slo-schema';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useFetchIndexPatternFields } from '../../../../hooks/slo/use_fetch_index_pattern_fields';
import { createOptionsFromFields } from '../../helpers/create_options';
import { CreateSLOForm } from '../../types';

interface Props {
  index?: string;
}
export function GroupByFieldSelector({ index }: Props) {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();
  const { isLoading, data: indexFields = [] } = useFetchIndexPatternFields(index);
  const groupableFields = indexFields.filter((field) => field.aggregatable);

  const label = i18n.translate('xpack.observability.slo.sloEdit.groupBy.placeholder', {
    defaultMessage: 'Select an optional field to partition by',
  });

  return (
    <EuiFlexItem>
      <EuiFormRow
        label={
          <span>
            {i18n.translate('xpack.observability.slo.sloEdit.groupBy.label', {
              defaultMessage: 'Partition by',
            })}{' '}
            <EuiIconTip
              content={i18n.translate('xpack.observability.slo.sloEdit.groupBy.tooltip', {
                defaultMessage: 'Create individual SLOs for each value of the selected field.',
              })}
              position="top"
            />
          </span>
        }
        isInvalid={getFieldState('groupBy').invalid}
      >
        <Controller
          defaultValue={ALL_VALUE}
          name="groupBy"
          control={control}
          rules={{ required: false }}
          render={({ field, fieldState }) => (
            <EuiComboBox
              {...field}
              async
              placeholder={label}
              aria-label={label}
              isClearable
              isDisabled={!index}
              isInvalid={fieldState.invalid}
              isLoading={!!index && isLoading}
              onChange={(selected: EuiComboBoxOptionOption[]) => {
                if (selected.length) {
                  return field.onChange(selected[0].value);
                }

                field.onChange(ALL_VALUE);
              }}
              options={createOptionsFromFields(groupableFields)}
              selectedOptions={
                !!index &&
                !!field.value &&
                groupableFields.some((groupableField) => groupableField.name === field.value)
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
