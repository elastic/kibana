/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, Fragment } from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiButtonEmpty,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFormRow,
  EuiRange,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { MetricSelect } from './metric_select';
import { SingleFieldSelect } from '../single_field_select';
import { AggDescriptor } from '../../../common/descriptor_types';
import { AGG_TYPE, DEFAULT_PERCENTILE } from '../../../common/constants';
import { getTermsFields } from '../../index_pattern_util';
import { IFieldType } from '../../../../../../src/plugins/data/public';

function filterFieldsForAgg(fields: IFieldType[], aggType: AGG_TYPE) {
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
  fields: IFieldType[];
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

    // unset field when new agg type does not support currently selected field.
    if ('field' in metric && metric.field && metricAggregationType !== AGG_TYPE.COUNT) {
      const fieldsForNewAggType = filterFieldsForAgg(fields, metricAggregationType);
      const found = fieldsForNewAggType.find((field) => {
        return field.name === metric.field;
      });
      if (found) {
        if (metricAggregationType === AGG_TYPE.PERCENTILE) {
          onChange({
            type: metricAggregationType,
            label: metric.label,
            field: metric.field,
            percentile: metric.percentile,
          });
        } else {
          onChange({
            type: metricAggregationType,
            label: metric.label,
            field: metric.field,
          });
        }
      } else {
        onChange({
          type: metricAggregationType,
          label: metric.label,
        });
      }
    } else {
      onChange({
        type: metricAggregationType,
        label: metric.label,
      });
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
  const onPercentileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (metric.type !== AGG_TYPE.PERCENTILE) {
      return;
    }
    onChange({
      ...metric,
      percentile: parseInt(e.target.value, 10),
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
    fieldSelect = (
      <EuiFormRow
        label={i18n.translate('xpack.maps.metricsEditor.selectFieldLabel', {
          defaultMessage: 'Field',
        })}
        display="columnCompressed"
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.metricsEditor.selectFieldPlaceholder', {
            defaultMessage: 'Select field',
          })}
          value={metric.field ? metric.field : null}
          onChange={onFieldChange}
          fields={filterFieldsForAgg(fields, metric.type)}
          isClearable={false}
          compressed
        />
      </EuiFormRow>
    );
  }

  let percentileSelect;
  if (metric.type === AGG_TYPE.PERCENTILE) {
    percentileSelect = (
      <EuiFormRow
        label={i18n.translate('xpack.maps.metricsEditor.selectPercentileLabel', {
          defaultMessage: 'Percentile',
        })}
        display="columnCompressed"
      >
        <EuiRange
          min={0}
          max={100}
          step={1}
          value={typeof metric.percentile === 'number' ? metric.percentile : DEFAULT_PERCENTILE}
          onChange={onPercentileChange}
          showLabels
          showValue
          aria-label="percentile select"
        />
      </EuiFormRow>
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
