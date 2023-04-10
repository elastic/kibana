/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import { CreateSLOInput } from '@kbn/slo-schema';

import {
  Field,
  useFetchIndexPatternFields,
} from '../../../../hooks/slo/use_fetch_index_pattern_fields';
import { IndexSelection } from './index_selection';
import { QueryBuilder } from '../common/query_builder';

interface Option {
  label: string;
  value: string;
}

export function CustomKqlIndicatorTypeForm() {
  const { control, watch } = useFormContext<CreateSLOInput>();

  const { isLoading, data: indexFields } = useFetchIndexPatternFields(
    watch('indicator.params.index')
  );
  const timestampFields = (indexFields ?? []).filter((field) => field.type === 'date');

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="row" gutterSize="l">
        <EuiFlexItem>
          <IndexSelection control={control} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.observability.slo.sloEdit.sliType.customKql.timestampField.label',
              { defaultMessage: 'Timestamp field' }
            )}
          >
            <Controller
              name="indicator.params.timestampField"
              shouldUnregister
              defaultValue=""
              rules={{ required: true }}
              control={control}
              render={({ field: { ref, ...field }, fieldState }) => (
                <EuiComboBox
                  {...field}
                  async
                  placeholder={i18n.translate(
                    'xpack.observability.slo.sloEdit.sliType.customKql.timestampField.placeholder',
                    { defaultMessage: 'Select a timestamp field' }
                  )}
                  aria-label={i18n.translate(
                    'xpack.observability.slo.sloEdit.sliType.customKql.timestampField.placeholder',
                    { defaultMessage: 'Select a timestamp field' }
                  )}
                  data-test-subj="customKqlIndicatorFormTimestampFieldSelect"
                  isClearable={true}
                  isDisabled={!watch('indicator.params.index')}
                  isInvalid={!!fieldState.error}
                  isLoading={!!watch('indicator.params.index') && isLoading}
                  onChange={(selected: EuiComboBoxOptionOption[]) => {
                    if (selected.length) {
                      return field.onChange(selected[0].value);
                    }

                    field.onChange('');
                  }}
                  options={createOptions(timestampFields)}
                  selectedOptions={
                    !!watch('indicator.params.index') &&
                    !!field.value &&
                    timestampFields.some((timestampField) => timestampField.name === field.value)
                      ? [
                          {
                            value: field.value,
                            label: field.value,
                            'data-test-subj': `customKqlIndicatorFormTimestampFieldSelectedValue`,
                          },
                        ]
                      : []
                  }
                  singleSelection={{ asPlainText: true }}
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexItem>
        <QueryBuilder
          control={control}
          dataTestSubj="customKqlIndicatorFormQueryFilterInput"
          indexPatternString={watch('indicator.params.index')}
          label={i18n.translate('xpack.observability.slo.sloEdit.sliType.customKql.queryFilter', {
            defaultMessage: 'Query filter',
          })}
          name="indicator.params.filter"
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.sliType.customKql.customFilter',
            {
              defaultMessage: 'Custom filter to apply on the index',
            }
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <QueryBuilder
          control={control}
          dataTestSubj="customKqlIndicatorFormGoodQueryInput"
          indexPatternString={watch('indicator.params.index')}
          label={i18n.translate('xpack.observability.slo.sloEdit.sliType.customKql.goodQuery', {
            defaultMessage: 'Good query',
          })}
          name="indicator.params.good"
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.sliType.customKql.goodQueryPlaceholder',
            {
              defaultMessage: 'Define the good events',
            }
          )}
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <QueryBuilder
          control={control}
          dataTestSubj="customKqlIndicatorFormTotalQueryInput"
          indexPatternString={watch('indicator.params.index')}
          label={i18n.translate('xpack.observability.slo.sloEdit.sliType.customKql.totalQuery', {
            defaultMessage: 'Total query',
          })}
          name="indicator.params.total"
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.sliType.customKql.totalQueryPlaceholder',
            {
              defaultMessage: 'Define the total events',
            }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function createOptions(fields: Field[]): Option[] {
  return fields
    .map((field) => ({ label: field.name, value: field.name }))
    .sort((a, b) => String(a.label).localeCompare(b.label));
}
