/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiButtonIcon,
} from '@elastic/eui';

import {
  MetricSelect,
  METRIC_AGGREGATION_VALUES,
} from './metric_select';
import { SingleFieldSelect } from './single_field_select';

export function MetricsEditor({ fields, metrics, onChange, allowMultipleMetrics, metricsFilter }) {

  function onMetricChange(metric, index) {
    onChange([
      ...metrics.slice(0, index),
      metric,
      ...metrics.slice(index + 1)
    ]);
  }

  function renderMetrics() {
    return metrics.map((metric, index) => {
      const onAggChange = (metricAggregationType) => {
        const updatedMetric = {
          ...metric,
          type: metricAggregationType,
        };
        onMetricChange(updatedMetric, index);
      };
      const onFieldChange = (fieldName) => {
        const updatedMetric = {
          ...metric,
          field: fieldName,
        };
        onMetricChange(updatedMetric, index);
      };
      const onRemove = () => {
        onChange([
          ...metrics.slice(0, index),
          ...metrics.slice(index + 1)
        ]);
      };
      let fieldSelect;
      if (metric.type && metric.type !== 'count') {
        const filterNumberFields = (field) => {
          return field.type === 'number';
        };
        fieldSelect = (
          <EuiFlexItem>
            <SingleFieldSelect
              placeholder="Select field"
              value={metric.field}
              onChange={onFieldChange}
              filterField={filterNumberFields}
              fields={fields}
              isClearable={false}
            />
          </EuiFlexItem>
        );
      }
      let removeButton;
      if (index > 0) {
        removeButton = (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label="Delete metric"
              title="Delete metric"
              onClick={onRemove}
            />
          </EuiFlexItem>
        );
      }
      return (
        <EuiFlexGroup alignItems="center" key={index}>

          <EuiFlexItem>
            <MetricSelect
              onChange={onAggChange}
              value={metric.type}
              metricsFilter={metricsFilter}
            />
          </EuiFlexItem>

          {fieldSelect}

          {removeButton}

        </EuiFlexGroup>
      );
    });
  }

  function addMetric() {
    onChange([
      ...metrics,
      {},
    ]);
  }

  function renderAddMetricButton() {

    if (!allowMultipleMetrics) {
      return null;
    }

    return (<EuiButtonIcon
      iconType="plusInCircle"
      onClick={addMetric}
      aria-label="Add metric"
      title="Add metric"
    />);
  }


  return (
    <Fragment>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={true}>
          <EuiFormLabel style={{ marginBottom: 0 }}>
            Metrics
          </EuiFormLabel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {renderAddMetricButton()}
        </EuiFlexItem>
      </EuiFlexGroup>

      {renderMetrics()}
    </Fragment>
  );
}

MetricsEditor.propTypes = {
  metrics: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.oneOf(METRIC_AGGREGATION_VALUES),
    field: PropTypes.string,
  })),
  fields: PropTypes.object,  // indexPattern.fields IndexedArray object
  onChange: PropTypes.func.isRequired,
  allowMultipleMetrics: PropTypes.bool,
  metricsFilter: PropTypes.func,
};

MetricsEditor.defaultProps = {
  metrics: [
    { type: 'count' }
  ]
};
