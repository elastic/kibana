/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiSpacer, EuiTextAlign } from '@elastic/eui';
import { MetricEditor } from './metric_editor';
import { METRIC_TYPE } from '../../common/constants';

export function MetricsEditor({ fields, metrics, onChange, allowMultipleMetrics, metricsFilter }) {
  function renderMetrics() {
    return metrics.map((metric, index) => {
      const onMetricChange = metric => {
        onChange([...metrics.slice(0, index), metric, ...metrics.slice(index + 1)]);
      };

      const onRemove = () => {
        onChange([...metrics.slice(0, index), ...metrics.slice(index + 1)]);
      };

      let removeButton;
      if (index > 0) {
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
        <div key={index} className="mapMetricEditorPanel__metricEditor">
          <MetricEditor
            onChange={onMetricChange}
            metric={metric}
            fields={fields}
            metricsFilter={metricsFilter}
            removeButton={removeButton}
          />
        </div>
      );
    });
  }

  function addMetric() {
    onChange([...metrics, {}]);
  }

  function renderAddMetricButton() {
    if (!allowMultipleMetrics) {
      return null;
    }

    return (
      <>
        <EuiSpacer size="xs" />
        <EuiTextAlign textAlign="center">
          <EuiButtonEmpty onClick={addMetric} size="xs" iconType="plusInCircleFilled">
            <FormattedMessage
              id="xpack.maps.metricsEditor.addMetricButtonLabel"
              defaultMessage="Add metric"
            />
          </EuiButtonEmpty>
        </EuiTextAlign>
      </>
    );
  }

  return (
    <Fragment>
      <div className="mapMapLayerPanel__metrics">{renderMetrics()}</div>

      {renderAddMetricButton()}
    </Fragment>
  );
}

MetricsEditor.propTypes = {
  metrics: PropTypes.array,
  fields: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  allowMultipleMetrics: PropTypes.bool,
  metricsFilter: PropTypes.func,
};

MetricsEditor.defaultProps = {
  metrics: [{ type: METRIC_TYPE.COUNT }],
  allowMultipleMetrics: true,
};
