/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useFetchIndexPatternFields } from '../../../../hooks/slo/use_fetch_index_pattern_fields';
import { createOptionsFromFields } from '../../helpers/create_options';
import { CreateSLOForm } from '../../types';
import { DataPreviewChart } from '../common/data_preview_chart';
import { QueryBuilder } from '../common/query_builder';
import { IndexSelection } from '../custom_common/index_selection';

export function CustomKqlIndicatorTypeForm() {
  const { control, watch, getFieldState } = useFormContext<CreateSLOForm>();

  const index = watch('indicator.params.index');
  const { isLoading, data: indexFields } = useFetchIndexPatternFields(index);
  const timestampFields = (indexFields ?? []).filter((field) => field.type === 'date');

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup direction="row" gutterSize="l">
        <EuiFlexItem>
          <IndexSelection />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.observability.slo.sloEdit.sliType.customKql.timestampField.label',
              { defaultMessage: 'Timestamp field' }
            )}
            isInvalid={getFieldState('indicator.params.timestampField').invalid}
          >
            <Controller
              name="indicator.params.timestampField"
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
                  options={createOptionsFromFields(timestampFields)}
                  selectedOptions={
                    !!index &&
                    !!field.value &&
                    timestampFields.some((timestampField) => timestampField.name === field.value)
                      ? [{ value: field.value, label: field.value }]
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
          dataTestSubj="customKqlIndicatorFormQueryFilterInput"
          indexPatternString={watch('indicator.params.index')}
          label={i18n.translate('xpack.observability.slo.sloEdit.sliType.customKql.queryFilter', {
            defaultMessage: 'Query filter',
          })}
          name="indicator.params.filter"
          placeholder={i18n.translate(
            'xpack.observability.slo.sloEdit.sliType.customKql.customFilter',
            { defaultMessage: 'Custom filter to apply on the index' }
          )}
          tooltip={
            <EuiIconTip
              content={i18n.translate(
                'xpack.observability.slo.sloEdit.sliType.customKql.customFilter.tooltip',
                {
                  defaultMessage:
                    'This KQL query can be used to filter the documents with some relevant criteria.',
                }
              )}
              position="top"
            />
          }
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <QueryBuilder
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
          required
          tooltip={
            <EuiIconTip
              content={i18n.translate(
                'xpack.observability.slo.sloEdit.sliType.customKql.goodQuery.tooltip',
                {
                  defaultMessage:
                    'This KQL query should return a subset of events that are considered "good" or "successful" for the purpose of calculating the SLO. The query should filter events based on some relevant criteria, such as status codes, error messages, or other relevant fields.',
                }
              )}
              position="top"
            />
          }
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <QueryBuilder
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
          tooltip={
            <EuiIconTip
              content={i18n.translate(
                'xpack.observability.slo.sloEdit.sliType.customKql.totalQuery.tooltip',
                {
                  defaultMessage:
                    'This KQL query should return all events that are relevant to the SLO calculation, including both good and bad events.',
                }
              )}
              position="top"
            />
          }
        />
      </EuiFlexItem>

      <DataPreviewChart />
    </EuiFlexGroup>
  );
}
