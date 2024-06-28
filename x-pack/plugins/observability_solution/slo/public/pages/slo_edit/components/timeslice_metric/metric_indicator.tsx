/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIconTip,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { DataView, FieldSpec } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { first, range, xor } from 'lodash';
import React from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { QueryBuilder } from '../common/query_builder';
import { COMPARATOR_OPTIONS } from '../../constants';
import { CreateSLOForm } from '../../types';
import { MetricInput } from './metric_input';

interface MetricIndicatorProps {
  indexFields: FieldSpec[];
  isLoadingIndex: boolean;
  dataView?: DataView;
}

export const NEW_TIMESLICE_METRIC = { name: 'A', aggregation: 'avg' as const, field: '' };
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

const equationLabel = i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.equationLabel', {
  defaultMessage: 'Equation',
});

const equationTooltip = (
  <EuiIconTip
    content={i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.totalEquation.tooltip', {
      defaultMessage: 'This supports basic math (A + B / C) and boolean logic (A < B ? A : B).',
    })}
    position="top"
  />
);

const thresholdLabel = i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.thresholdLabel', {
  defaultMessage: 'Threshold',
});

const thresholdTooltip = (
  <EuiIconTip
    content={i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.threshold.tooltip', {
      defaultMessage:
        'This value combined with the comparator will determine if the slice is "good" or "bad".',
    })}
    position="top"
  />
);

export function MetricIndicator({ indexFields, isLoadingIndex, dataView }: MetricIndicatorProps) {
  const { control, watch, setValue, register, getFieldState } = useFormContext<CreateSLOForm>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `indicator.params.metric.metrics`,
  });
  const equation = watch(`indicator.params.metric.equation`);
  const indexPattern = watch('indicator.params.index');

  const disableAdd = fields?.length === MAX_VARIABLES || !indexPattern;
  const disableDelete = fields?.length === 1 || !indexPattern;

  const setDefaultEquationIfUnchanged = (previousNames: string[], nextNames: string[]) => {
    const defaultEquation = createEquationFromMetric(previousNames);
    if (defaultEquation === equation) {
      setValue(`indicator.params.metric.equation`, createEquationFromMetric(nextNames));
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
    append({ ...NEW_TIMESLICE_METRIC, name });
  };

  return (
    <>
      <EuiFlexItem>
        {fields?.map((metric, index, arr) => (
          <React.Fragment key={metric.id}>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <input hidden {...register(`indicator.params.metric.metrics.${index}.name`)} />
              <MetricInput
                isLoadingIndex={isLoadingIndex}
                metricIndex={index}
                indexPattern={indexPattern}
                indexFields={indexFields}
              />
              <EuiFlexItem grow={0}>
                <EuiButtonIcon
                  data-test-subj="o11yMetricIndicatorButton"
                  iconType="trash"
                  color="danger"
                  style={{ marginTop: '1.5em' }}
                  onClick={handleDeleteMetric(index)}
                  disabled={disableDelete}
                  title={i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.deleteLabel', {
                    defaultMessage: 'Delete metric',
                  })}
                  aria-label={i18n.translate(
                    'xpack.slo.sloEdit.sliType.timesliceMetric.deleteLabel',
                    { defaultMessage: 'Delete metric' }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <QueryBuilder
              dataTestSubj="timesliceMetricIndicatorFormMetricQueryInput"
              dataView={dataView}
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
            {index !== arr.length - 1 && <EuiHorizontalRule size="quarter" />}
          </React.Fragment>
        ))}
        <EuiFlexGroup>
          <EuiFlexItem grow={0}>
            <EuiSpacer size="xs" />
            <EuiButtonEmpty
              data-test-subj="timesliceMetricIndicatorAddMetricButton"
              color={'primary'}
              size="xs"
              iconType={'plusInCircleFilled'}
              onClick={handleAddMetric}
              isDisabled={disableAdd}
              aria-label={i18n.translate(
                'xpack.slo.sloEdit.sliType.timesliceMetric.addMetricAriaLabel',
                { defaultMessage: 'Add metric' }
              )}
            >
              <FormattedMessage
                id="xpack.slo.sloEdit.sliType.timesliceMetric.addMetricLabel"
                defaultMessage="Add metric"
              />
            </EuiButtonEmpty>
            <EuiSpacer size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem>
            <Controller
              name={`indicator.params.metric.equation`}
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
                  isInvalid={fieldState.invalid}
                  error={[
                    i18n.translate(
                      'xpack.slo.sloEdit.sliType.timesliceMetric.equation.invalidCharacters',
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
                    disabled={!indexPattern}
                    fullWidth
                    value={field.value}
                    data-test-subj="timesliceMetricEquation"
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </EuiFormRow>
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={0}>
            <Controller
              name={`indicator.params.metric.comparator`}
              rules={{
                required: true,
              }}
              control={control}
              render={({ field: { ref, ...field }, fieldState }) => (
                <EuiFormRow
                  fullWidth
                  isInvalid={fieldState.invalid}
                  label={i18n.translate(
                    'xpack.slo.sloEdit.sliType.timesliceMetric.comparatorLabel',
                    {
                      defaultMessage: 'Comparator',
                    }
                  )}
                >
                  <EuiSelect
                    {...field}
                    data-test-subj="timesliceMetricComparatorSelection"
                    disabled={!indexPattern}
                    value={field.value}
                    options={COMPARATOR_OPTIONS}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </EuiFormRow>
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={0}>
            <EuiFormRow
              fullWidth
              isInvalid={getFieldState('indicator.params.metric.threshold').invalid}
              label={
                <span>
                  {thresholdLabel} {thresholdTooltip}
                </span>
              }
            >
              <Controller
                name={'indicator.params.metric.threshold'}
                control={control}
                rules={{
                  required: true,
                }}
                defaultValue={0}
                render={({ field: { ref, ...field }, fieldState }) => (
                  <EuiFieldNumber
                    {...field}
                    data-test-subj="timesliceMetricThreshold"
                    required
                    isInvalid={fieldState.invalid}
                    value={String(field.value)}
                    style={{ width: 80 }}
                    disabled={!indexPattern}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                )}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.equationHelpText', {
                defaultMessage:
                  'Supports basic math equations, valid charaters are: A-Z, +, -, /, *, (, ), ?, !, &, :, |, >, <, =',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexItem>
    </>
  );
}

const filterLabel = i18n.translate('xpack.slo.sloEdit.sliType.timesliceMetric.filterLabel', {
  defaultMessage: 'Filter',
});
