/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, Fragment } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty, EuiComboBoxOptionOption, EuiFieldText, EuiFormRow } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { MetricSelect } from './metric_select';
import { SingleFieldSelect } from '../single_field_select';
import { AggDescriptor } from '../../../common/descriptor_types';
import { AGG_TYPE } from '../../../common/constants';
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
    const newMetricProps = {
      ...metric,
      type: metricAggregationType,
    };

    // unset field when new agg type does not support currently selected field.
    if (metric.field && metricAggregationType !== AGG_TYPE.COUNT) {
      const fieldsForNewAggType = filterFieldsForAgg(fields, metricAggregationType);
      const found = fieldsForNewAggType.find((field) => {
        return field.name === metric.field;
      });
      if (!found) {
        newMetricProps.field = undefined;
      }
    }

    onChange(newMetricProps);
  };
  const onFieldChange = (fieldName?: string) => {
    if (!fieldName) {
      return;
    }
    onChange({
      ...metric,
      field: fieldName,
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
      {labelInput}
      {removeButton}
    </Fragment>
  );
}
