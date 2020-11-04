/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiComboBoxOptionOption, EuiSpacer, EuiTextAlign } from '@elastic/eui';
import { MetricEditor } from './metric_editor';
import { DEFAULT_METRIC } from '../../classes/sources/es_agg_source';
import { IFieldType } from '../../../../../../src/plugins/data/public';
import { AggDescriptor } from '../../../common/descriptor_types';
import { AGG_TYPE } from '../../../common/constants';

interface Props {
  allowMultipleMetrics: boolean;
  metrics: AggDescriptor[];
  fields: IFieldType[];
  onChange: (metrics: AggDescriptor[]) => void;
  metricsFilter?: (metricOption: EuiComboBoxOptionOption<AGG_TYPE>) => boolean;
}

export function MetricsEditor({
  fields,
  metrics = [DEFAULT_METRIC],
  onChange,
  allowMultipleMetrics = true,
  metricsFilter,
}: Props) {
  function renderMetrics() {
    // There was a bug in 7.8 that initialized metrics to [].
    // This check is needed to handle any saved objects created before the bug was patched.
    const nonEmptyMetrics = metrics.length === 0 ? [DEFAULT_METRIC] : metrics;
    return nonEmptyMetrics.map((metric, index) => {
      const onMetricChange = (updatedMetric: AggDescriptor) => {
        onChange([...metrics.slice(0, index), updatedMetric, ...metrics.slice(index + 1)]);
      };

      const onRemove = () => {
        onChange([...metrics.slice(0, index), ...metrics.slice(index + 1)]);
      };

      return (
        <div key={index} className="mapMetricEditorPanel__metricEditor">
          <MetricEditor
            onChange={onMetricChange}
            metric={metric}
            fields={fields}
            metricsFilter={metricsFilter}
            showRemoveButton={index > 0}
            onRemove={onRemove}
          />
        </div>
      );
    });
  }

  function addMetric() {
    onChange([...metrics, { type: AGG_TYPE.AVG }]);
  }

  function renderAddMetricButton() {
    if (!allowMultipleMetrics) {
      return null;
    }

    return (
      <Fragment>
        <EuiSpacer size="xs" />
        <EuiTextAlign textAlign="center">
          <EuiButtonEmpty onClick={addMetric} size="xs" iconType="plusInCircleFilled">
            <FormattedMessage
              id="xpack.maps.metricsEditor.addMetricButtonLabel"
              defaultMessage="Add metric"
            />
          </EuiButtonEmpty>
        </EuiTextAlign>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <div className="mapMapLayerPanel__metrics">{renderMetrics()}</div>

      {renderAddMetricButton()}
    </Fragment>
  );
}
