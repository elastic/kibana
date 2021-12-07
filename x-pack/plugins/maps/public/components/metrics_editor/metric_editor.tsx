/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Fragment } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty, EuiComboBoxOptionOption, EuiFieldText, EuiFormRow } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import type { IndexPatternField } from 'src/plugins/data/public';
import { MetricSelect } from './metric_select';
import { SingleFieldSelect } from '../single_field_select';
import { AggDescriptor } from '../../../common/descriptor_types';
import { AGG_TYPE, DEFAULT_PERCENTILE } from '../../../common/constants';
import { getTermsFields } from '../../index_pattern_util';
import { ValidatedNumberInput } from '../validated_number_input';

function filterFieldsForAgg(fields: IndexPatternField[], aggType: AGG_TYPE) {
  if (!fields) {
    return [];
  }

  if (aggType === AGG_TYPE.UNIQUE_COUNT || aggType === AGG_TYPE.TERMS) {
    return getTermsFields(fields);
  }

  const metricAggFieldTypes = ['number'];
  if (aggType !== AGG_TYPE.SUM) {
    metricAggFieldTypes.push('date');
  }

  return fields.filter((field) => {
    return field.aggregatable && metricAggFieldTypes.includes(field.type);
  });
}

interface Props {
  metric: AggDescriptor;
  fields: IndexPatternField[];
  onChange: (metric: AggDescriptor) => void;
  onRemove: () => void;
  metricsFilter?: (metricOption: EuiComboBoxOptionOption<AGG_TYPE>) => boolean;
  showRemoveButton: boolean;
}

export function MetricEditor({
  fields,
  metricsFilter,
  metric,
  onChange,
  showRemoveButton,
  onRemove,
}: Props) {
  const onAggChange = (metricAggregationType?: AGG_TYPE) => {
    if (!metricAggregationType) {
      return;
    }

    const descriptor = {
      type: metricAggregationType,
      label: metric.label,
    };

    if (metricAggregationType === AGG_TYPE.COUNT || !('field' in metric) || !metric.field) {
      onChange(descriptor);
      return;
    }

    const fieldsForNewAggType = filterFieldsForAgg(fields, metricAggregationType);
    const found = fieldsForNewAggType.find((field) => field.name === metric.field);
    const newDescriptor = {
      ...descriptor,
      field: found ? metric.field : undefined,
    };
    if (metricAggregationType === AGG_TYPE.PERCENTILE) {
      onChange({
        ...newDescriptor,
        percentile: 'percentile' in metric ? metric.percentile : DEFAULT_PERCENTILE,
      });
    } else {
      onChange(newDescriptor);
    }
  };
  const onFieldChange = (fieldName?: string) => {
    if (!fieldName || metric.type === AGG_TYPE.COUNT) {
      return;
    }
    onChange({
      label: metric.label,
      type: metric.type,
      field: fieldName,
    });
  };

  const onPercentileChange = (percentile: number) => {
    if (metric.type !== AGG_TYPE.PERCENTILE) {
      return;
    }
    onChange({
      ...metric,
      percentile,
    });
  };
  const onLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...metric,
      label: e.target.value,
    });
  };

  let fieldSelect;
  if (metric.type && metric.type !== AGG_TYPE.COUNT) {
    const showErrors = metric.field === undefined;
    fieldSelect = (
      <EuiFormRow
        label={i18n.translate('xpack.maps.metricsEditor.selectFieldLabel', {
          defaultMessage: 'Field',
        })}
        display="columnCompressed"
        isInvalid={showErrors}
        error={i18n.translate('xpack.maps.metricsEditor.selectFieldError', {
          defaultMessage: 'Field required for aggregation',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.metricsEditor.selectFieldPlaceholder', {
            defaultMessage: 'Select field',
          })}
          value={metric.field ? metric.field : null}
          onChange={onFieldChange}
          fields={filterFieldsForAgg(fields, metric.type)}
          isClearable={false}
          isInvalid={showErrors}
          compressed
        />
      </EuiFormRow>
    );
  }

  let percentileSelect;
  if (metric.type === AGG_TYPE.PERCENTILE) {
    const label = i18n.translate('xpack.maps.metricsEditor.selectPercentileLabel', {
      defaultMessage: 'Percentile',
    });
    percentileSelect = (
      <ValidatedNumberInput
        min={0}
        max={100}
        onChange={onPercentileChange}
        label={label}
        initialValue={
          typeof metric.percentile === 'number' ? metric.percentile : DEFAULT_PERCENTILE
        }
        display="columnCompressed"
      />
    );
  }

  let labelInput;
  if (metric.type) {
    labelInput = (
      <EuiFormRow
        label={i18n.translate('xpack.maps.metricsEditor.customLabel', {
          defaultMessage: 'Custom label',
        })}
        display="columnCompressed"
      >
        <EuiFieldText
          onChange={onLabelChange}
          value={metric.label ? metric.label : ''}
          compressed
        />
      </EuiFormRow>
    );
  }

  let removeButton;
  if (showRemoveButton) {
    removeButton = (
      <div className="mapMetricEditorPanel__metricRemoveButton">
        <EuiButtonEmpty
          iconType="trash"
          size="xs"
          color="danger"
          onClick={onRemove}
          aria-label={i18n.translate('xpack.maps.metricsEditor.deleteMetricAriaLabel', {
            defaultMessage: 'Delete metric',
          })}
        >
          <FormattedMessage
            id="xpack.maps.metricsEditor.deleteMetricButtonLabel"
            defaultMessage="Delete metric"
          />
        </EuiButtonEmpty>
      </div>
    );
  }

  return (
    <Fragment>
      <EuiFormRow
        label={i18n.translate('xpack.maps.metricsEditor.aggregationLabel', {
          defaultMessage: 'Aggregation',
        })}
        display="columnCompressed"
      >
        <MetricSelect
          onChange={onAggChange}
          value={metric.type}
          metricsFilter={metricsFilter}
          compressed
        />
      </EuiFormRow>

      {fieldSelect}
      {percentileSelect}
      {labelInput}
      {removeButton}
    </Fragment>
  );
}
