/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import { MetricSelect, METRIC_AGGREGATION_VALUES } from './metric_select';
import { SingleFieldSelect } from './single_field_select';
import { AGG_TYPE } from '../../common/constants';
import { getTermsFields } from '../index_pattern_util';

function filterFieldsForAgg(fields, aggType) {
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

export function MetricEditor({ fields, metricsFilter, metric, onChange, removeButton }) {
  const onAggChange = (metricAggregationType) => {
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
  const onFieldChange = (fieldName) => {
    onChange({
      ...metric,
      field: fieldName,
    });
  };
  const onLabelChange = (e) => {
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
          value={metric.field}
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

MetricEditor.propTypes = {
  metric: PropTypes.shape({
    type: PropTypes.oneOf(METRIC_AGGREGATION_VALUES),
    field: PropTypes.string,
    label: PropTypes.string,
  }),
  fields: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  metricsFilter: PropTypes.func,
};
