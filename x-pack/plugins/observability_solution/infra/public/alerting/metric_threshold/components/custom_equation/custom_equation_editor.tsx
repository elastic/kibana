/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFieldText,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { omit, range, first, xor, debounce } from 'lodash';
import { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataViewBase } from '@kbn/es-query';
import { OMITTED_AGGREGATIONS_FOR_CUSTOM_METRICS } from '../../../../../common/http_api';
import {
  Aggregators,
  CustomMetricAggTypes,
  MetricExpressionCustomMetric,
} from '../../../../../common/alerting/metrics';
import { MetricExpression } from '../../types';
import { CustomMetrics, AggregationTypes, NormalizedFields } from './types';
import { MetricRowWithAgg } from './metric_row_with_agg';
import { MetricRowWithCount } from './metric_row_with_count';
import {
  CUSTOM_EQUATION,
  EQUATION_HELP_MESSAGE,
  LABEL_HELP_MESSAGE,
  LABEL_LABEL,
} from '../../i18n_strings';

export interface CustomEquationEditorProps {
  onChange: (expression: MetricExpression) => void;
  expression: MetricExpression;
  fields: NormalizedFields;
  aggregationTypes: AggregationTypes;
  errors: IErrorObject;
  dataView?: DataViewBase;
}

const NEW_METRIC = { name: 'A', aggType: Aggregators.AVERAGE as CustomMetricAggTypes };
const MAX_VARIABLES = 26;
const CHAR_CODE_FOR_A = 65;
const CHAR_CODE_FOR_Z = CHAR_CODE_FOR_A + MAX_VARIABLES;
const VAR_NAMES = range(CHAR_CODE_FOR_A, CHAR_CODE_FOR_Z).map((c) => String.fromCharCode(c));

export const CustomEquationEditor = ({
  onChange,
  expression,
  fields,
  aggregationTypes,
  errors,
}: CustomEquationEditorProps) => {
  const [customMetrics, setCustomMetrics] = useState<CustomMetrics>(
    expression?.customMetrics ?? [NEW_METRIC]
  );
  const [label, setLabel] = useState<string | undefined>(expression?.label || undefined);
  const [equation, setEquation] = useState<string | undefined>(expression?.equation || undefined);
  const debouncedOnChange = useMemo(() => debounce(onChange, 500), [onChange]);

  const handleAddNewRow = useCallback(() => {
    setCustomMetrics((previous) => {
      const currentVars = previous?.map((m) => m.name) ?? [];
      const name = first(xor(VAR_NAMES, currentVars))!;
      const nextMetrics = [...(previous || []), { ...NEW_METRIC, name }];
      debouncedOnChange({ ...expression, customMetrics: nextMetrics, equation, label });
      return nextMetrics;
    });
  }, [debouncedOnChange, equation, expression, label]);

  const handleDelete = useCallback(
    (name: string) => {
      setCustomMetrics((previous) => {
        const nextMetrics = previous?.filter((row) => row.name !== name) ?? [NEW_METRIC];
        const finalMetrics = (nextMetrics.length && nextMetrics) || [NEW_METRIC];
        debouncedOnChange({ ...expression, customMetrics: finalMetrics, equation, label });
        return finalMetrics;
      });
    },
    [equation, expression, debouncedOnChange, label]
  );

  const handleChange = useCallback(
    (metric: MetricExpressionCustomMetric) => {
      setCustomMetrics((previous) => {
        const nextMetrics = previous?.map((m) => (m.name === metric.name ? metric : m));
        debouncedOnChange({ ...expression, customMetrics: nextMetrics, equation, label });
        return nextMetrics;
      });
    },
    [equation, expression, debouncedOnChange, label]
  );

  const handleEquationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEquation(e.target.value);
      debouncedOnChange({ ...expression, customMetrics, equation: e.target.value, label });
    },
    [debouncedOnChange, expression, customMetrics, label]
  );

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLabel(e.target.value);
      debouncedOnChange({ ...expression, customMetrics, equation, label: e.target.value });
    },
    [debouncedOnChange, expression, customMetrics, equation]
  );

  const disableAdd = customMetrics?.length === MAX_VARIABLES;
  const disableDelete = customMetrics?.length === 1;

  const filteredAggregationTypes = omit(aggregationTypes, OMITTED_AGGREGATIONS_FOR_CUSTOM_METRICS);

  const metricRows = customMetrics?.map((row) => {
    if (row.aggType === Aggregators.COUNT) {
      return (
        <MetricRowWithCount
          key={row.name}
          name={row.name}
          agg={row.aggType}
          filter={row.filter}
          onAdd={handleAddNewRow}
          onDelete={handleDelete}
          disableAdd={disableAdd}
          aggregationTypes={filteredAggregationTypes}
          disableDelete={disableDelete}
          onChange={handleChange}
          errors={errors}
        />
      );
    }
    return (
      <MetricRowWithAgg
        key={row.name}
        name={row.name}
        aggType={row.aggType}
        aggregationTypes={filteredAggregationTypes}
        field={row.field}
        fields={fields}
        onAdd={handleAddNewRow}
        onDelete={handleDelete}
        disableAdd={disableAdd}
        disableDelete={disableDelete}
        onChange={handleChange}
        errors={errors}
      />
    );
  });

  const placeholder = useMemo(() => {
    return customMetrics?.map((row) => row.name).join(' + ');
  }, [customMetrics]);

  return (
    <div style={{ minWidth: '100%' }}>
      <EuiSpacer size={'s'} />
      {metricRows}
      <EuiFlexGroup>
        <EuiButtonEmpty
          data-test-subj="infraCustomEquationEditorAddAggregationFieldButton"
          color={'primary'}
          flush={'left'}
          size="xs"
          iconType={'plusInCircleFilled'}
          onClick={handleAddNewRow}
          isDisabled={disableAdd}
        >
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.customEquationEditor.addCustomRow"
            defaultMessage="Add aggregation/field"
          />
        </EuiButtonEmpty>
      </EuiFlexGroup>
      <EuiSpacer size={'m'} />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.infra.metrics.alertFlyout.customEquationEditor.equation', {
              defaultMessage: 'Equation',
            })}
            fullWidth
            helpText={EQUATION_HELP_MESSAGE}
            isInvalid={errors.equation != null}
            error={[errors.equation]}
          >
            <EuiFieldText
              data-test-subj="infraCustomEquationEditorFieldText"
              isInvalid={errors.equation != null}
              compressed
              fullWidth
              placeholder={placeholder}
              onChange={handleEquationChange}
              value={equation ?? ''}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size={'s'} />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label={LABEL_LABEL} fullWidth helpText={LABEL_HELP_MESSAGE}>
            <EuiFieldText
              data-test-subj="infraCustomEquationEditorFieldText"
              compressed
              fullWidth
              value={label}
              placeholder={CUSTOM_EQUATION}
              onChange={handleLabelChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
