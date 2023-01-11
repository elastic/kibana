/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFieldText,
  EuiFormRow,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiBadge,
  EuiFlexItem,
  EuiPanel,
  EuiFlexGroup,
  EuiSelect,
  EuiComboBox,
} from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import { omit, range, first, xor, debounce, get } from 'lodash';
import { AggregationType, IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  Aggregators,
  CustomMetricAggTypes,
  MetricExpressionCustomMetric,
} from '../../../../common/alerting/metrics';
import { MetricExpression } from '../types';

interface NormalizedField {
  name: string;
  normalizedType: string;
}

type NormalizedFields = NormalizedField[];

interface AggregationTypes {
  [x: string]: AggregationType;
}

interface Props {
  onChange: (expression: MetricExpression) => void;
  expression: MetricExpression;
  fields: NormalizedFields;
  aggregationTypes: AggregationTypes;
  errors: IErrorObject;
}

type CustomMetrics = MetricExpression['customMetrics'];

const NEW_METRIC = { name: 'A', aggType: Aggregators.AVERAGE as CustomMetricAggTypes };
const VAR_NAMES = range(65, 65 + 26).map((c) => String.fromCharCode(c));

export const CustomMetricEditor: React.FC<Props> = ({
  onChange,
  expression,
  fields,
  aggregationTypes,
  errors,
}) => {
  const [customMetrics, setCustomMetrics] = useState<CustomMetrics>(
    expression?.customMetrics ?? [NEW_METRIC]
  );
  const [label, setLabel] = useState<string | undefined>(expression?.label || undefined);
  const [equation, setEquation] = useState<string | undefined>(expression?.equation || undefined);
  const debouncedOnChange = useMemo(() => debounce(onChange, 500), [onChange]);

  const handleAddNewRow = useCallback(() => {
    setCustomMetrics((previous) => {
      const currentVars = previous?.map((m) => m.name) ?? [];
      const name = first(xor(VAR_NAMES, currentVars)) || 'XX'; // This should never happen.
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

  const filteredAggregationTypes = omit(aggregationTypes, ['custom', 'rate', 'p99', 'p95']);

  const metricRows = customMetrics?.map((row) => {
    const disableAdd = customMetrics?.length === 26;
    const disableDelete = customMetrics?.length === 1;
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
    <EuiPanel>
      {metricRows}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label="Equation">
            <EuiFieldText
              compressed
              fullWidth
              placeholder={placeholder}
              onChange={handleEquationChange}
              value={equation ?? ''}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Label (optional)">
            <EuiFieldText
              compressed
              fullWidth
              value={label}
              placeholder="Custom metric"
              onChange={handleLabelChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

interface MetricRowBaseProps {
  name: string;
  onAdd: () => void;
  onDelete: (name: string) => void;
  disableDelete: boolean;
  disableAdd: boolean;
  onChange: (metric: MetricExpressionCustomMetric) => void;
  aggregationTypes: AggregationTypes;
  errors: IErrorObject;
}

interface MetricRowControlProps {
  onAdd: () => void;
  onDelete: () => void;
  disableDelete: boolean;
  disableAdd: boolean;
}

const MetricRowControls: React.FC<MetricRowControlProps> = ({
  onAdd,
  onDelete,
  disableDelete,
  disableAdd,
}) => {
  return (
    <>
      <EuiFlexItem grow={0}>
        <EuiButtonIcon
          iconType="plusInCircleFilled"
          style={{ marginBottom: '0.2em' }}
          onClick={onAdd}
          disabled={disableAdd}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={0}>
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          style={{ marginBottom: '0.2em' }}
          onClick={onDelete}
          disabled={disableDelete}
        />
      </EuiFlexItem>
    </>
  );
};

const MetricRowVarName: React.FC<{ name: string }> = ({ name }) => {
  return (
    <EuiFlexItem grow={0}>
      <EuiBadge style={{ paddingTop: '1.2em', height: '4.2em' }}>{name}</EuiBadge>
    </EuiFlexItem>
  );
};

interface MetricRowWithAggProps extends MetricRowBaseProps {
  aggType?: CustomMetricAggTypes;
  field?: string;
  fields: NormalizedFields;
}

const MetricRowWithAgg: React.FC<MetricRowWithAggProps> = ({
  name,
  aggType = Aggregators.AVERAGE,
  field,
  onAdd,
  onDelete,
  disableAdd,
  disableDelete,
  fields,
  aggregationTypes,
  onChange,
  errors,
}) => {
  const handleDelete = useCallback(() => {
    onDelete(name);
  }, [name, onDelete]);

  const fieldOptions = useMemo(
    () =>
      fields.reduce((acc, fieldValue) => {
        if (
          aggType &&
          aggregationTypes[aggType].validNormalizedTypes.includes(fieldValue.normalizedType)
        ) {
          acc.push({ label: fieldValue.name });
        }
        return acc;
      }, [] as Array<{ label: string }>),
    [fields, aggregationTypes, aggType]
  );

  const aggOptions = useMemo(
    () =>
      Object.values(aggregationTypes).map((a) => ({
        text: a.text,
        value: a.value,
      })),
    [aggregationTypes]
  );

  const handleFieldChange = useCallback(
    (selectedOptions: EuiComboBoxOptionOption[]) => {
      onChange({
        name,
        field: (selectedOptions.length && selectedOptions[0].label) || undefined,
        aggType,
      });
    },
    [name, aggType, onChange]
  );

  const handleAggChange = useCallback(
    (el: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({
        name,
        field,
        aggType: el.target.value as CustomMetricAggTypes,
      });
    },
    [name, field, onChange]
  );

  const isAggInvalid = get(errors, ['customMetrics', name, 'aggType']) != null;
  const isFieldInvalid = get(errors, ['customMetrics', name, 'field']) != null;

  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="flexEnd">
        <MetricRowVarName name={name} />
        <EuiFlexItem style={{ maxWidth: 145 }}>
          <EuiFormRow label="Agg" isInvalid={isAggInvalid}>
            <EuiSelect
              compressed
              options={aggOptions}
              value={aggType}
              isInvalid={isAggInvalid}
              onChange={handleAggChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Field" isInvalid={isFieldInvalid}>
            <EuiComboBox
              fullWidth
              compressed
              isInvalid={isFieldInvalid}
              singleSelection={{ asPlainText: true }}
              options={fieldOptions}
              selectedOptions={field ? [{ label: field }] : []}
              onChange={handleFieldChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <MetricRowControls
          onAdd={onAdd}
          onDelete={handleDelete}
          disableAdd={disableAdd}
          disableDelete={disableDelete}
        />
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
    </>
  );
};

interface MetricRowWithCountProps extends MetricRowBaseProps {
  agg?: Aggregators;
  filter?: string;
}

const MetricRowWithCount: React.FC<MetricRowWithCountProps> = ({
  name,
  agg,
  filter,
  onAdd,
  onDelete,
  disableAdd,
  disableDelete,
  onChange,
  aggregationTypes,
}) => {
  const aggOptions = useMemo(
    () =>
      Object.values(aggregationTypes)
        .filter((aggType) => aggType.value !== Aggregators.CUSTOM)
        .map((aggType) => ({
          text: aggType.text,
          value: aggType.value,
        })),
    [aggregationTypes]
  );

  const handleDelete = useCallback(() => {
    onDelete(name);
  }, [name, onDelete]);

  const handleAggChange = useCallback(
    (el: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({
        name,
        filter,
        aggType: el.target.value as CustomMetricAggTypes,
      });
    },
    [name, filter, onChange]
  );

  const handleFilterChange = useCallback(
    (el: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        name,
        filter: el.target.value,
        aggType: agg as CustomMetricAggTypes,
      });
    },
    [name, agg, onChange]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="flexEnd">
        <MetricRowVarName name={name} />
        <EuiFlexItem style={{ maxWidth: 145 }}>
          <EuiFormRow label="Agg">
            <EuiSelect compressed options={aggOptions} value={agg} onChange={handleAggChange} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="KQL filter">
            <EuiFieldText compressed value={filter} onChange={handleFilterChange} />
          </EuiFormRow>
        </EuiFlexItem>
        <MetricRowControls
          onAdd={onAdd}
          onDelete={handleDelete}
          disableDelete={disableDelete}
          disableAdd={disableAdd}
        />
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
    </>
  );
};
