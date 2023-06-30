/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFormRow, EuiHorizontalRule, EuiFlexItem, EuiFlexGroup, EuiSelect } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { DataViewBase } from '@kbn/es-query';
import { Aggregators, CustomMetricAggTypes } from '../../../../../common/threshold_rule/types';
import { MetricRowControls } from './metric_row_controls';
import { MetricRowBaseProps } from './types';
import { MetricsExplorerKueryBar } from '../kuery_bar';

interface MetricRowWithCountProps extends MetricRowBaseProps {
  agg?: Aggregators;
  filter?: string;
  dataView: DataViewBase;
}

export function MetricRowWithCount({
  name,
  agg,
  filter,
  onDelete,
  disableDelete,
  onChange,
  aggregationTypes,
  dataView,
}: MetricRowWithCountProps) {
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
    (filterString: string) => {
      onChange({
        name,
        filter: filterString,
        aggType: agg as CustomMetricAggTypes,
      });
    },
    [name, agg, onChange]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="flexEnd">
        <EuiFlexItem style={{ maxWidth: 145 }}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.observability.threshold.rule.alertFlyout.customEquationEditor.aggregationLabel',
              { defaultMessage: 'Aggregation {name}', values: { name } }
            )}
          >
            <EuiSelect
              data-test-subj="thresholdRuleMetricRowWithCountSelect"
              compressed
              options={aggOptions}
              value={agg}
              onChange={handleAggChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.observability.threshold.rule.alertFlyout.customEquationEditor.filterLabel',
              { defaultMessage: 'KQL Filter {name}', values: { name } }
            )}
          >
            <MetricsExplorerKueryBar
              placeholder={' '}
              compressed
              derivedIndexPattern={dataView}
              onChange={handleFilterChange}
              onSubmit={handleFilterChange}
              value={filter}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <MetricRowControls onDelete={handleDelete} disableDelete={disableDelete} />
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
    </>
  );
}
