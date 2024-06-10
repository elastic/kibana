/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIconTip,
  EuiSpacer,
} from '@elastic/eui';
import { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { first, range, xor } from 'lodash';
import React, { useEffect, useState } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import {
  aggValueToLabel,
  CUSTOM_METRIC_AGGREGATION_OPTIONS,
} from '../../helpers/aggregation_options';
import { createOptionsFromFields, Option } from '../../helpers/create_options';
import { CreateSLOForm } from '../../types';
import { QueryBuilder } from '../common/query_builder';

interface MetricIndicatorProps {
  type: 'good' | 'total';
  metricFields: FieldSpec[];
  isLoadingIndex: boolean;
  dataView?: DataView;
}

export const NEW_CUSTOM_METRIC = { name: 'A', aggregation: 'sum' as const, field: '' };
const MAX_VARIABLES = 26;
const CHAR_CODE_FOR_A = 65;
const CHAR_CODE_FOR_Z = CHAR_CODE_FOR_A + MAX_VARIABLES;
const VAR_NAMES = range(CHAR_CODE_FOR_A, CHAR_CODE_FOR_Z).map((c) => String.fromCharCode(c));
const INVALID_EQUATION_REGEX = /[^A-Z|+|\-|\s|\d+|\.|\(|\)|\/|\*|>|<|=|\?|\:|&|\!|\|]+/;
const validateEquation = (value: string) => {
  const result = value.match(INVALID_EQUATION_REGEX);
  return result === null;
};

function createEquationFromMetric(names: string[]) {
  return names.join(' + ');
}

const metricLabel = i18n.translate('xpack.slo.sloEdit.sliType.customMetric.metricLabel', {
  defaultMessage: 'Metric',
});

const filterLabel = i18n.translate('xpack.slo.sloEdit.sliType.customMetric.filterLabel', {
  defaultMessage: 'Filter',
});

const metricTooltip = (
  <EuiIconTip
    content={i18n.translate('xpack.slo.sloEdit.sliType.customMetric.totalMetric.tooltip', {
      defaultMessage:
        'This data from this field will be aggregated with the "sum" aggregation or document count.',
    })}
    position="top"
  />
);

const equationLabel = i18n.translate('xpack.slo.sloEdit.sliType.customMetric.equationLabel', {
  defaultMessage: 'Equation',
});

const equationTooltip = (
  <EuiIconTip
    content={i18n.translate('xpack.slo.sloEdit.sliType.customMetric.totalEquation.tooltip', {
      defaultMessage: 'This supports basic math (A + B / C) and boolean logic (A < B ? A : B).',
    })}
    position="top"
  />
);

export function MetricIndicator({
  type,
  metricFields,
  isLoadingIndex,
  dataView,
}: MetricIndicatorProps) {
  const { control, watch, setValue, register, getFieldState } = useFormContext<CreateSLOForm>();
  const [options, setOptions] = useState<Option[]>(createOptionsFromFields(metricFields));
  const [aggregationOptions, setAggregationOptions] = useState(CUSTOM_METRIC_AGGREGATION_OPTIONS);

  useEffect(() => {
    setOptions(createOptionsFromFields(metricFields));
  }, [metricFields]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: `indicator.params.${type}.metrics`,
  });
  const equation = watch(`indicator.params.${type}.equation`);
  const indexPattern = watch('indicator.params.index');

  const disableAdd = fields?.length === MAX_VARIABLES || !indexPattern;
  const disableDelete = fields?.length === 1 || !indexPattern;

  const setDefaultEquationIfUnchanged = (previousNames: string[], nextNames: string[]) => {
    const defaultEquation = createEquationFromMetric(previousNames);
    if (defaultEquation === equation) {
      setValue(`indicator.params.${type}.equation`, createEquationFromMetric(nextNames));
    }
  };

  const handleDeleteMetric = (index: number) => () => {
    const currentVars = fields.map((m) => m.name) ?? ['A'];
    const deletedVar = currentVars[index];
    setDefaultEquationIfUnchanged(currentVars, xor(currentVars, [deletedVar]));
    remove(index);
  };

  const handleAddMetric = () => {
    const currentVars = fields.map((m) => m.name) ?? ['A'];
    const name = first(xor(VAR_NAMES, currentVars))!;
    setDefaultEquationIfUnchanged(currentVars, [...currentVars, name]);
    append({ ...NEW_CUSTOM_METRIC, name });
  };

  return (
    <>
      <EuiFlexItem>
        {fields?.map((metric, index, arr) => (
          <div key={metric.id}>
            <EuiFlexGroup alignItems="center" gutterSize="xs" key={metric.id}>
              <input hidden {...register(`indicator.params.${type}.metrics.${index}.name`)} />
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  isInvalid={
                    getFieldState(`indicator.params.${type}.metrics.${index}.aggregation`).invalid
                  }
                  label={
                    <span>
                      {i18n.translate('xpack.slo.sloEdit.customMetric.aggregationLabel', {
                        defaultMessage: 'Aggregation',
                      })}{' '}
                      {metric.name}
                    </span>
                  }
                >
                  <Controller
                    name={`indicator.params.${type}.metrics.${index}.aggregation`}
                    defaultValue="sum"
                    rules={{ required: true }}
                    control={control}
                    render={({ field: { ref, ...field }, fieldState }) => (
                      <EuiComboBox
                        {...field}
                        async
                        fullWidth
                        singleSelection={{ asPlainText: true }}
                        placeholder={i18n.translate(
                          'xpack.slo.sloEdit.sliType.customMetric.aggregation.placeholder',
                          { defaultMessage: 'Select an aggregation' }
                        )}
                        aria-label={i18n.translate(
                          'xpack.slo.sloEdit.sliType.customMetric.aggregation.placeholder',
                          { defaultMessage: 'Select an aggregation' }
                        )}
                        isClearable
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
                          CUSTOM_METRIC_AGGREGATION_OPTIONS.some((agg) => agg.value === field.value)
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
                            CUSTOM_METRIC_AGGREGATION_OPTIONS.filter(({ value }) =>
                              value.includes(searchValue)
                            )
                          );
                        }}
                        options={aggregationOptions}
                      />
                    )}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              {watch(`indicator.params.${type}.metrics.${index}.aggregation`) !== 'doc_count' && (
                <EuiFlexItem>
                  <EuiFormRow
                    fullWidth
                    isInvalid={
                      getFieldState(`indicator.params.${type}.metrics.${index}.field`).invalid
                    }
                    label={
                      <span>
                        {metricLabel} {metric.name} {metricTooltip}
                      </span>
                    }
                  >
                    <Controller
                      name={`indicator.params.${type}.metrics.${index}.field`}
                      defaultValue=""
                      rules={{ required: true }}
                      shouldUnregister
                      control={control}
                      render={({ field: { ref, ...field }, fieldState }) => (
                        <EuiComboBox
                          {...field}
                          async
                          fullWidth
                          singleSelection={{ asPlainText: true }}
                          placeholder={i18n.translate(
                            'xpack.slo.sloEdit.sliType.customMetric.metricField.placeholder',
                            { defaultMessage: 'Select a metric field' }
                          )}
                          aria-label={i18n.translate(
                            'xpack.slo.sloEdit.sliType.customMetric.metricField.placeholder',
                            { defaultMessage: 'Select a metric field' }
                          )}
                          isClearable
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
                            setOptions(
                              createOptionsFromFields(metricFields, ({ value }) =>
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
              )}
              <EuiFlexItem grow={0}>
                <EuiButtonIcon
                  data-test-subj="o11yMetricIndicatorButton"
                  iconType="trash"
                  color="danger"
                  style={{ marginTop: '1.5em' }}
                  onClick={handleDeleteMetric(index)}
                  disabled={disableDelete}
                  title={i18n.translate('xpack.slo.sloEdit.sliType.customMetric.deleteLabel', {
                    defaultMessage: 'Delete metric',
                  })}
                  aria-label={i18n.translate('xpack.slo.sloEdit.sliType.customMetric.deleteLabel', {
                    defaultMessage: 'Delete metric',
                  })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <QueryBuilder
              dataTestSubj="customKqlIndicatorFormGoodQueryInput"
              dataView={dataView}
              label={`${filterLabel} ${metric.name}`}
              name={`indicator.params.${type}.metrics.${index}.filter`}
              placeholder={i18n.translate('xpack.slo.sloEdit.sliType.customMetric.placeholder', {
                defaultMessage: 'KQL filter',
              })}
              required={false}
              tooltip={
                <EuiIconTip
                  content={i18n.translate('xpack.slo.sloEdit.sliType.customMetric.tooltip', {
                    defaultMessage: 'This KQL query should return a subset of events.',
                  })}
                  position="top"
                />
              }
            />
            {index !== arr.length - 1 && <EuiHorizontalRule size="quarter" />}
          </div>
        ))}
        <EuiFlexGroup>
          <EuiFlexItem grow={0}>
            <EuiSpacer size="xs" />
            <EuiButtonEmpty
              data-test-subj="customMetricIndicatorAddMetricButton"
              color={'primary'}
              size="xs"
              iconType={'plusInCircleFilled'}
              onClick={handleAddMetric}
              isDisabled={disableAdd}
              aria-label={i18n.translate(
                'xpack.slo.sloEdit.sliType.customMetric.addMetricAriaLabel',
                { defaultMessage: 'Add metric' }
              )}
            >
              <FormattedMessage
                id="xpack.slo.sloEdit.sliType.customMetric.addMetricLabel"
                defaultMessage="Add metric"
              />
            </EuiButtonEmpty>
            <EuiSpacer size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <Controller
          name={`indicator.params.${type}.equation`}
          defaultValue=""
          rules={{
            required: true,
            validate: { validateEquation },
          }}
          control={control}
          render={({ field: { ref, ...field }, fieldState }) => (
            <EuiFormRow
              fullWidth
              label={
                <span>
                  {equationLabel} {equationTooltip}
                </span>
              }
              helpText={i18n.translate('xpack.slo.sloEdit.sliType.customMetric.equationHelpText', {
                defaultMessage:
                  'Supports basic math equations, valid charaters are: A-Z, +, -, /, *, (, ), ?, !, &, :, |, >, <, =',
              })}
              isInvalid={fieldState.invalid}
              error={[
                i18n.translate(
                  'xpack.slo.sloEdit.sliType.customMetric.equation.invalidCharacters',
                  {
                    defaultMessage:
                      'The equation field only supports the following characters: A-Z, +, -, /, *, (, ), ?, !, &, :, |, >, <, =',
                  }
                ),
              ]}
            >
              <EuiFieldText
                {...field}
                isInvalid={fieldState.invalid}
                fullWidth
                data-test-subj="o11yCustomMetricEquation"
              />
            </EuiFormRow>
          )}
        />
      </EuiFlexItem>
    </>
  );
}
