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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
} from '@elastic/eui';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { createOptionsFromFields, Option } from '../../helpers/create_options';
import { CreateSLOForm } from '../../types';
import { QueryBuilder } from '../common/query_builder';

interface HistogramIndicatorProps {
  type: 'good' | 'total';
  histogramFields: FieldSpec[];
  isLoadingIndex: boolean;
}

const AGGREGATIONS = {
  value_count: {
    value: 'value_count',
    label: i18n.translate('xpack.slo.sloEdit.sliType.histogram.valueCountLabel', {
      defaultMessage: 'Value count',
    }),
  },
  range: {
    value: 'range',
    label: i18n.translate('xpack.slo.sloEdit.sliType.histogram.rangeLabel', {
      defaultMessage: 'Range',
    }),
  },
};

const AGGREGATION_OPTIONS = Object.values(AGGREGATIONS);

const aggregationTooltip = (
  <EuiIconTip
    content={i18n.translate('xpack.slo.sloEdit.sliType.histogram.aggregationTooltip', {
      defaultMessage:
        'The "value count" aggreation will return the total count for the histogram field. Range will return the count from the histogram field that is within the range defined below.',
    })}
    position="top"
  />
);

const fromTooltip = (
  <EuiIconTip
    content={i18n.translate('xpack.slo.sloEdit.sliType.histogram.fromTooltip', {
      defaultMessage: 'The "from" value is inclusive.',
    })}
    position="top"
  />
);

const toTooltip = (
  <EuiIconTip
    content={i18n.translate('xpack.slo.sloEdit.sliType.histogram.toTooltip', {
      defaultMessage: 'The "to" value is NOT inclusive.',
    })}
    position="top"
  />
);

const aggregationLabel = i18n.translate('xpack.slo.sloEdit.sliType.histogram.aggregationLabel', {
  defaultMessage: 'Aggregation',
});

const metricLabel = i18n.translate('xpack.slo.sloEdit.sliType.histogram.metricLabel', {
  defaultMessage: 'Field',
});

const toLabel = i18n.translate('xpack.slo.sloEdit.sliType.histogram.toLabel', {
  defaultMessage: 'To',
});

const fromLabel = i18n.translate('xpack.slo.sloEdit.sliType.histogram.fromLabel', {
  defaultMessage: 'From',
});

export function HistogramIndicator({
  type,
  histogramFields,
  isLoadingIndex,
}: HistogramIndicatorProps) {
  const { control, watch, getFieldState } = useFormContext<CreateSLOForm>();
  const [options, setOptions] = useState<Option[]>(createOptionsFromFields(histogramFields));

  useEffect(() => {
    setOptions(createOptionsFromFields(histogramFields));
  }, [histogramFields]);

  const indexPattern = watch('indicator.params.index');
  const aggregation = watch(`indicator.params.${type}.aggregation`);

  return (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={
              <span>
                {aggregationLabel} {aggregationTooltip}
              </span>
            }
          >
            <Controller
              name={`indicator.params.${type}.aggregation`}
              rules={{ required: true }}
              control={control}
              render={({ field: { ref, ...field }, fieldState }) => (
                <EuiComboBox
                  {...field}
                  async
                  fullWidth
                  singleSelection={{ asPlainText: true }}
                  placeholder={i18n.translate(
                    'xpack.slo.sloEdit.sliType.histogram.aggregation.placeholder',
                    { defaultMessage: 'Select an aggregation' }
                  )}
                  aria-label={i18n.translate(
                    'xpack.slo.sloEdit.sliType.histogram.aggregation.placeholder',
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
                  selectedOptions={!!field.value ? [AGGREGATIONS[field.value]] : []}
                  options={AGGREGATION_OPTIONS}
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            isInvalid={getFieldState(`indicator.params.${type}.field`).invalid}
            label={<span>{metricLabel}</span>}
          >
            <Controller
              name={`indicator.params.${type}.field`}
              defaultValue=""
              rules={{ required: true }}
              control={control}
              render={({ field: { ref, ...field }, fieldState }) => (
                <EuiComboBox
                  {...field}
                  async
                  fullWidth
                  singleSelection={{ asPlainText: true }}
                  placeholder={i18n.translate(
                    'xpack.slo.sloEdit.sliType.histogram.metricField.placeholder',
                    { defaultMessage: 'Select a histogram field' }
                  )}
                  aria-label={i18n.translate(
                    'xpack.slo.sloEdit.sliType.histogram.metricField.placeholder',
                    { defaultMessage: 'Select a histogram field' }
                  )}
                  isInvalid={fieldState.invalid}
                  isDisabled={isLoadingIndex || !indexPattern}
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
                    histogramFields.some((histoField) => histoField.name === field.value)
                      ? [
                          {
                            value: field.value,
                            label: field.value,
                          },
                        ]
                      : []
                  }
                  onSearchChange={(searchValue: string) => {
                    setOptions(
                      createOptionsFromFields(histogramFields, ({ value }) =>
                        value.includes(searchValue)
                      )
                    );
                  }}
                  options={options}
                />
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        {aggregation === 'range' && (
          <EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={
                    <span>
                      {fromLabel} {fromTooltip}
                    </span>
                  }
                >
                  <Controller
                    name={`indicator.params.${type}.from`}
                    defaultValue={NaN}
                    control={control}
                    rules={{ required: true }}
                    shouldUnregister
                    render={({ field: { ref, ...field }, fieldState }) => (
                      <EuiFieldNumber
                        {...field}
                        required
                        fullWidth
                        isInvalid={fieldState.invalid}
                        value={String(field.value)}
                        data-test-subj="histogramRangeFrom"
                        min={0}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    )}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={
                    <span>
                      {toLabel} {toTooltip}
                    </span>
                  }
                >
                  <Controller
                    name={`indicator.params.${type}.to`}
                    defaultValue={NaN}
                    rules={{ required: true }}
                    shouldUnregister
                    control={control}
                    render={({ field: { ref, ...field }, fieldState }) => (
                      <EuiFieldNumber
                        {...field}
                        required
                        fullWidth
                        isInvalid={fieldState.invalid}
                        value={String(field.value)}
                        data-test-subj="histogramRangeTo"
                        min={0}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    )}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <QueryBuilder
            dataTestSubj={`histogramIndicatorForm${type}QueryInput`}
            indexPatternString={indexPattern}
            label={i18n.translate('xpack.slo.sloEdit.sliType.histogram.kqlFilterLabel', {
              defaultMessage: 'KQL filter',
            })}
            name={`indicator.params.${type}.filter`}
            placeholder=""
            required={false}
            tooltip={
              <EuiIconTip
                content={i18n.translate('xpack.slo.sloEdit.sliType.histogram.query.tooltip', {
                  defaultMessage:
                    'This KQL query should return a subset of events for this indicator.',
                })}
                position="top"
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
}
