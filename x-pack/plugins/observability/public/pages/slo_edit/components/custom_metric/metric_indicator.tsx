/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode, useEffect } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext, useFieldArray } from 'react-hook-form';
import { CreateSLOInput } from '@kbn/slo-schema';
import { range, first, xor } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { Field } from '../../../../hooks/slo/use_fetch_index_pattern_fields';

interface Option {
  label: string;
  value: string;
}

interface MetricIndicatorProps {
  type: 'good' | 'total';
  indexFields: Field[] | undefined;
  isLoadingIndex: boolean;
  metricLabel: string;
  equationLabel: string;
  metricTooltip: ReactNode;
  equationTooltip: ReactNode;
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

function createOptions(fields: Field[]): Option[] {
  return fields
    .map((field) => ({ label: field.name, value: field.name }))
    .sort((a, b) => String(a.label).localeCompare(b.label));
}

function createEquationFromMetric(names: string[]) {
  return names.join(' + ');
}

export function MetricIndicator({
  type,
  indexFields,
  isLoadingIndex,
  metricLabel,
  equationLabel,
  metricTooltip,
  equationTooltip,
}: MetricIndicatorProps) {
  const { control, watch, setValue } = useFormContext<CreateSLOInput>();

  const metricFields = (indexFields ?? []).filter((field) => field.type === 'number');

  const {
    fields: metrics,
    append,
    remove,
  } = useFieldArray({
    control,
    name: `indicator.params.${type}.metrics`,
  });
  const equation = watch(`indicator.params.${type}.equation`);
  const indexPattern = watch('indicator.params.index');

  // Without this, the hidden fields for metric.name and metric.aggregation will
  // not be included in the JSON when the form is submitted.
  useEffect(() => {
    metrics.forEach((metric, index) => {
      setValue(`indicator.params.${type}.metrics.${index}.name`, metric.name);
      setValue(`indicator.params.${type}.metrics.${index}.aggregation`, metric.aggregation);
    });
  }, [metrics, setValue, type]);

  const disableAdd = metrics?.length === MAX_VARIABLES;
  const disableDelete = metrics?.length === 1;

  const setDefaultEquationIfUnchanged = (previousNames: string[], nextNames: string[]) => {
    const defaultEquation = createEquationFromMetric(previousNames);
    if (defaultEquation === equation) {
      setValue(`indicator.params.${type}.equation`, createEquationFromMetric(nextNames));
    }
  };

  const handleDeleteMetric = (index: number) => () => {
    const currentVars = metrics.map((m) => m.name) ?? ['A'];
    const deletedVar = currentVars[index];
    setDefaultEquationIfUnchanged(currentVars, xor(currentVars, [deletedVar]));
    remove(index);
  };

  const handleAddMetric = () => {
    const currentVars = metrics.map((m) => m.name) ?? ['A'];
    const name = first(xor(VAR_NAMES, currentVars))!;
    setDefaultEquationIfUnchanged(currentVars, [...currentVars, name]);
    append({ ...NEW_CUSTOM_METRIC, name });
  };

  return (
    <>
      <EuiFlexItem>
        {metrics?.map((metric, index) => (
          <EuiFormRow
            fullWidth
            label={
              <span>
                {metricLabel} {metric.name} {metricTooltip}
              </span>
            }
            key={metric.id}
          >
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem>
                <Controller
                  name={`indicator.params.${type}.metrics.${index}.field`}
                  shouldUnregister
                  defaultValue=""
                  rules={{ required: true }}
                  control={control}
                  render={({ field: { ref, ...field }, fieldState }) => (
                    <EuiComboBox
                      {...field}
                      async
                      fullWidth
                      singleSelection={{ asPlainText: true }}
                      prepend={i18n.translate(
                        'xpack.observability.slo.sloEdit.sliType.customMetric.sumLabel',
                        { defaultMessage: 'Sum of' }
                      )}
                      placeholder={i18n.translate(
                        'xpack.observability.slo.sloEdit.sliType.customMetric.metricField.placeholder',
                        { defaultMessage: 'Select a metric field' }
                      )}
                      aria-label={i18n.translate(
                        'xpack.observability.slo.sloEdit.sliType.customMetric.metricField.placeholder',
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
                                'data-test-subj': `customMetricIndicatorFormMetricFieldSelectedValue`,
                              },
                            ]
                          : []
                      }
                      options={createOptions(metricFields)}
                    />
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={0}>
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  style={{ marginBottom: '0.2em' }}
                  onClick={handleDeleteMetric(index)}
                  disabled={disableDelete}
                  title={i18n.translate(
                    'xpack.observability.slo.sloEdit.sliType.customMetric.deleteLabel',
                    { defaultMessage: 'Delete metric' }
                  )}
                  aria-label={i18n.translate(
                    'xpack.observability.slo.sloEdit.sliType.customMetric.deleteLabel',
                    { defaultMessage: 'Delete metric' }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
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
                'xpack.observability.slo.sloEdit.sliType.customMetric.addMetricAriaLabel',
                { defaultMessage: 'Add metric' }
              )}
            >
              <FormattedMessage
                id="xpack.observability.slo.sloEdit.sliType.customMetric.addMetricLabel"
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
          shouldUnregister
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
              helpText={i18n.translate(
                'xpack.observability.slo.sloEdit.sliType.customMetric.equationHelpText',
                {
                  defaultMessage:
                    'Supports basic math equations, valid charaters are: A-Z, +, -, /, *, (, ), ?, !, &, :, |, >, <, =',
                }
              )}
              isInvalid={fieldState.invalid}
              error={[
                i18n.translate(
                  'xpack.observability.slo.sloEdit.sliType.customMetric.equation.invalidCharacters',
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
