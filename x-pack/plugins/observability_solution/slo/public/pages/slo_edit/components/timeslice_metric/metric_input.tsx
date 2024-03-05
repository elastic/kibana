/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldNumber,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
} from '@elastic/eui';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { AGGREGATION_OPTIONS, aggValueToLabel } from '../../helpers/aggregation_options';
import { createOptionsFromFields, Option } from '../../helpers/create_options';
import { CreateSLOForm } from '../../types';
import { QueryBuilder } from '../common/query_builder';

const fieldLabel = i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.fieldLabel', {
  defaultMessage: 'Field',
});

const aggregationLabel = i18n.translate(
  'xpack.slo.sloEdit.sliType.timesliceMetric.aggregationLabel',
  { defaultMessage: 'Aggregation' }
);

const filterLabel = i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.filterLabel', {
  defaultMessage: 'Filter',
});

const fieldTooltip = (
  <EuiIconTip
    content={i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.totalMetric.tooltip', {
      defaultMessage: 'This is the field used in the aggregation.',
    })}
    position="top"
  />
);

const NUMERIC_FIELD_TYPES = ['number', 'histogram'];
const CARDINALITY_FIELD_TYPES = ['number', 'string'];

interface MetricInputProps {
  metricIndex: number;
  indexPattern: string;
  isLoadingIndex: boolean;
  indexFields: FieldSpec[];
}

export function MetricInput({
  metricIndex: index,
  indexPattern,
  isLoadingIndex,
  indexFields,
}: MetricInputProps) {
  const { control, watch } = useFormContext<CreateSLOForm>();
  const metric = watch(`indicator.params.metric.metrics.${index}`);
  const metricAggregation = watch(`indicator.params.metric.metrics.${index}.aggregation`);

  const [metricFields, setMetricFields] = useState(
    indexFields.filter((field) => NUMERIC_FIELD_TYPES.includes(field.type))
  );
  const [aggregationOptions, setAggregationOptions] = useState(AGGREGATION_OPTIONS);
  const [fieldOptions, setFieldOptions] = useState<Option[]>(createOptionsFromFields(metricFields));

  useEffect(() => {
    setMetricFields(
      indexFields.filter((field) =>
        metricAggregation === 'cardinality'
          ? CARDINALITY_FIELD_TYPES.includes(field.type)
          : NUMERIC_FIELD_TYPES.includes(field.type)
      )
    );
  }, [metricAggregation, setMetricFields, indexFields]);

  useEffect(() => {
    setFieldOptions(createOptionsFromFields(metricFields));
  }, [metricFields, setFieldOptions]);

  return (
    <>
      <EuiFlexItem>
        <Controller
          name={`indicator.params.metric.metrics.${index}.aggregation`}
          defaultValue="avg"
          rules={{ required: true }}
          control={control}
          render={({ field: { ref, ...field }, fieldState }) => (
            <EuiFormRow
              fullWidth
              label={
                <span>
                  {aggregationLabel} {metric.name}
                </span>
              }
              isInvalid={fieldState.invalid}
            >
              <EuiComboBox
                {...field}
                async
                fullWidth
                isClearable={false}
                singleSelection={{ asPlainText: true }}
                placeholder={i18n.translate(
                  'xpack.slo.sloEdit.sliType.timesliceMetric.aggregationField.placeholder',
                  { defaultMessage: 'Select an aggregation' }
                )}
                aria-label={i18n.translate(
                  'xpack.slo.sloEdit.sliType.timesliceMetric.aggregationField.placeholder',
                  { defaultMessage: 'Select an aggregation' }
                )}
                isInvalid={fieldState.invalid}
                isDisabled={!indexPattern}
                isLoading={!!indexPattern && isLoadingIndex}
                onChange={(selected: EuiComboBoxOptionOption[]) => {
                  if (selected.length) {
                    return field.onChange(selected[0].value);
                  }
                  field.onChange('');
                }}
                selectedOptions={
                  !!indexPattern &&
                  !!field.value &&
                  AGGREGATION_OPTIONS.some((agg) => agg.value === field.value)
                    ? [
                        {
                          value: field.value,
                          label: aggValueToLabel(field.value),
                        },
                      ]
                    : []
                }
                onSearchChange={(searchValue: string) => {
                  setAggregationOptions(
                    AGGREGATION_OPTIONS.filter(({ value }) => value.includes(searchValue))
                  );
                }}
                options={aggregationOptions}
              />
            </EuiFormRow>
          )}
        />
      </EuiFlexItem>
      {metricAggregation === 'percentile' && (
        <EuiFlexItem grow={0}>
          <Controller
            name={`indicator.params.metric.metrics.${index}.percentile`}
            defaultValue={95}
            rules={{
              required: true,
              min: 0.001,
              max: 99.999,
            }}
            shouldUnregister={true}
            control={control}
            render={({ field: { ref, onChange, ...field }, fieldState }) => (
              <EuiFormRow
                fullWidth
                isInvalid={fieldState.invalid}
                label={
                  <span>
                    {i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.percentileLabel', {
                      defaultMessage: 'Percentile',
                    })}{' '}
                    {metric.name}
                  </span>
                }
              >
                <EuiFieldNumber
                  {...field}
                  style={{ width: 80 }}
                  data-test-subj="timesliceMetricPercentileNumber"
                  required
                  min={0.1}
                  max={99.999}
                  step={0.1}
                  value={field.value}
                  isInvalid={fieldState.invalid}
                  disabled={!indexPattern}
                  isLoading={!!indexPattern && isLoadingIndex}
                  onChange={(event) => onChange(Number(event.target.value))}
                />
              </EuiFormRow>
            )}
          />
        </EuiFlexItem>
      )}
      {metricAggregation !== 'doc_count' && (
        <EuiFlexItem>
          <Controller
            name={`indicator.params.metric.metrics.${index}.field`}
            defaultValue=""
            rules={{ required: true }}
            shouldUnregister={true}
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <EuiFormRow
                fullWidth
                isInvalid={fieldState.invalid}
                label={
                  <span>
                    {fieldLabel} {metric.name} {fieldTooltip}
                  </span>
                }
              >
                <EuiComboBox
                  {...field}
                  async
                  fullWidth
                  singleSelection={{ asPlainText: true }}
                  placeholder={i18n.translate(
                    'xpack.slo.sloEdit.sliType.timesliceMetric.metricField.placeholder',
                    { defaultMessage: 'Select a metric field' }
                  )}
                  aria-label={i18n.translate(
                    'xpack.slo.sloEdit.sliType.timesliceMetric.metricField.placeholder',
                    { defaultMessage: 'Select a metric field' }
                  )}
                  isInvalid={fieldState.invalid}
                  isDisabled={!indexPattern}
                  isLoading={!!indexPattern && isLoadingIndex}
                  onChange={(selected: EuiComboBoxOptionOption[]) => {
                    if (selected.length) {
                      return field.onChange(selected[0].value);
                    }
                    field.onChange('');
                  }}
                  selectedOptions={
                    !!indexPattern &&
                    !!field.value &&
                    metricFields.some((metricField) => metricField.name === field.value)
                      ? [
                          {
                            value: field.value,
                            label: field.value,
                          },
                        ]
                      : []
                  }
                  onSearchChange={(searchValue: string) => {
                    setFieldOptions(
                      createOptionsFromFields(metricFields, ({ value }) =>
                        value.includes(searchValue)
                      )
                    );
                  }}
                  options={fieldOptions}
                />
              </EuiFormRow>
            )}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <QueryBuilder
          dataTestSubj="timesliceMetricIndicatorFormMetricQueryInput"
          indexPatternString={watch('indicator.params.index')}
          label={`${filterLabel} ${metric.name}`}
          name={`indicator.params.metric.metrics.${index}.filter`}
          placeholder={i18n.translate(
            'xpack.slo.sloEdit.sliType.timesliceMetric.goodQuery.placeholder',
            { defaultMessage: 'KQL filter' }
          )}
          required={false}
          tooltip={
            <EuiIconTip
              content={i18n.translate(
                'xpack.slo.sloEdit.sliType.timesliceMetric.goodQuery.tooltip',
                {
                  defaultMessage: 'This KQL query should return a subset of events.',
                }
              )}
              position="top"
            />
          }
        />
      </EuiFlexItem>
    </>
  );
}
