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
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { range, first, xor, debounce } from 'lodash';
import { AggregationType } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { Aggregators, MetricExpressionCustomMetric } from '../../../../common/alerting/metrics';
import { MetricExpression } from '../types';

interface NormalizedField {
  name: string;
  normalizedType: string;
}

type NormalizedFields = NormalizedField[];

interface AggregationTypes {
  [x: string]: AggregationType;
}

type CustomAggType = Exclude<Aggregators, Aggregators.CUSTOM>;

interface Props {
  onChange: (expression: MetricExpression) => void;
  expression: MetricExpression;
  fields: NormalizedFields;
  aggregationTypes: AggregationTypes;
}

type Metrics = MetricExpression['metrics'];

const NEW_METRIC = { name: 'A', aggType: Aggregators.AVERAGE as CustomAggType };
const VAR_NAMES = range(65, 65 + 26).map((c) => String.fromCharCode(c));

export const CustomMetricEditor: React.FC<Props> = ({
  onChange,
  expression,
  fields,
  aggregationTypes,
}) => {
  const [metrics, setMetrics] = useState<Metrics>(expression?.metrics ?? [NEW_METRIC]);
  const [equation, setEquation] = useState<string | undefined>(expression?.equation || undefined);

  const handleAddNewRow = useCallback(() => {
    setMetrics((previous) => {
      const currentVars = previous?.map((m) => m.name) ?? [];
      const name = first(xor(VAR_NAMES, currentVars)) || 'XX'; // This should never happen.
      return [...(previous || []), { ...NEW_METRIC, name }];
    });
  }, [setMetrics]);

  const handleDelete = useCallback(
    (name: string) => {
      setMetrics((previous) => {
        const nextMetrics = previous?.filter((row) => row.name !== name) ?? [NEW_METRIC];
        return (nextMetrics.length && nextMetrics) || [NEW_METRIC];
      });
    },
    [setMetrics]
  );

  const handleChange = useCallback(
    (metric: MetricExpressionCustomMetric) => {
      setMetrics((previous) => {
        return previous?.map((m) => (m.name === metric.name ? metric : m));
      });
    },
    [setMetrics]
  );

  const handleEquationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEquation(e.target.value);
    },
    [setEquation]
  );

  const debouncedOnChange = useMemo(() => debounce(onChange, 200), [onChange]);

  useEffect(() => {
    debouncedOnChange({ ...expression, metrics, equation });
  }, [metrics, equation, expression, onChange, debouncedOnChange]);

  const metricRows = metrics?.map((row) => {
    const disableAdd = metrics?.length === 26;
    const disableDelete = metrics?.length === 1;
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
          aggregationTypes={aggregationTypes}
          disableDelete={disableDelete}
          onChange={handleChange}
        />
      );
    }
    return (
      <MetricRowWithAgg
        key={row.name}
        name={row.name}
        aggType={row.aggType}
        aggregationTypes={aggregationTypes}
        field={row.field}
        fields={fields}
        onAdd={handleAddNewRow}
        onDelete={handleDelete}
        disableAdd={disableAdd}
        disableDelete={disableDelete}
        onChange={handleChange}
      />
    );
  });

  const placeholder = useMemo(() => {
    return metrics?.map((row) => row.name).join(' + ');
  }, [metrics]);

  return (
    <EuiPanel>
      {metricRows}
      <EuiFlexGroup>
        <EuiFormRow label="Equation" fullWidth style={{ width: '100%' }}>
          <EuiFieldText
            compressed
            fullWidth
            placeholder={placeholder}
            onChange={handleEquationChange}
            value={equation ?? ''}
          />
        </EuiFormRow>
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
  aggType?: CustomAggType;
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
      Object.values(aggregationTypes)
        .filter((a) => ['custom', 'p99', 'p95', 'rate'].includes(a.value) === false)
        .map((a) => ({
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
        aggType: el.target.value as CustomAggType,
      });
    },
    [name, field, onChange]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="flexEnd">
        <MetricRowVarName name={name} />
        <EuiFlexItem style={{ maxWidth: 145 }}>
          <EuiFormRow label="Agg">
            <EuiSelect compressed options={aggOptions} value={aggType} onChange={handleAggChange} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Field">
            <EuiComboBox
              fullWidth
              compressed
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
        aggType: el.target.value as CustomAggType,
      });
    },
    [name, filter, onChange]
  );

  const handleFilterChange = useCallback(
    (el: React.ChangeEvent<HTMLInputElement>) => {
      onChange({
        name,
        filter: el.target.value,
        aggType: agg as CustomAggType,
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
            <EuiFieldText compressed onChange={handleFilterChange} />
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
