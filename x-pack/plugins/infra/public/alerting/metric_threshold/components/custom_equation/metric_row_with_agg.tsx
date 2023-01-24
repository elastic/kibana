/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFormRow,
  EuiHorizontalRule,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSelect,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Aggregators, CustomMetricAggTypes } from '../../../../../common/alerting/metrics';
import { MetricRowControls } from './metric_row_controls';
import { NormalizedFields, MetricRowBaseProps } from './types';

interface MetricRowWithAggProps extends MetricRowBaseProps {
  aggType?: CustomMetricAggTypes;
  field?: string;
  fields: NormalizedFields;
}

export const MetricRowWithAgg: React.FC<MetricRowWithAggProps> = ({
  name,
  aggType = Aggregators.AVERAGE,
  field,
  onDelete,
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
        <EuiFlexItem style={{ maxWidth: 145 }}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.infra.metrics.alertFlyout.customEquationEditor.aggregationLabel',
              { defaultMessage: 'Aggregation {name}', values: { name } }
            )}
            isInvalid={isAggInvalid}
          >
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
          <EuiFormRow
            label={i18n.translate(
              'xpack.infra.metrics.alertFlyout.customEquationEditor.fieldLabel',
              { defaultMessage: 'Field {name}', values: { name } }
            )}
            isInvalid={isFieldInvalid}
          >
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
        <MetricRowControls onDelete={handleDelete} disableDelete={disableDelete} />
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
    </>
  );
};
