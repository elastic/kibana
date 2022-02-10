/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiComboBoxOptionOption, EuiSpacer, EuiTextAlign } from '@elastic/eui';
import type { IndexPatternField } from 'src/plugins/data/public';
import { MetricEditor } from './metric_editor';
import { DEFAULT_METRIC } from '../../classes/sources/es_agg_source';
import { AggDescriptor, FieldedAggDescriptor } from '../../../common/descriptor_types';
import { AGG_TYPE } from '../../../common/constants';

export function isMetricValid(aggDescriptor: AggDescriptor) {
  return aggDescriptor.type === AGG_TYPE.COUNT
    ? true
    : (aggDescriptor as FieldedAggDescriptor).field !== undefined;
}

interface Props {
  allowMultipleMetrics: boolean;
  metrics: AggDescriptor[];
  fields: IndexPatternField[];
  onChange: (metrics: AggDescriptor[]) => void;
  metricsFilter?: (metricOption: EuiComboBoxOptionOption<AGG_TYPE>) => boolean;
}

interface State {
  metrics: AggDescriptor[];
}

export class MetricsEditor extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      // There was a bug in 7.8 that initialized metrics to [].
      // This check is needed to handle any saved objects created before the bug was patched.
      metrics: this.props.metrics.length === 0 ? [DEFAULT_METRIC] : this.props.metrics,
    };
  }

  _onSubmit() {
    const hasInvalidMetric = this.state.metrics.some((metric) => {
      return !isMetricValid(metric);
    });
    if (!hasInvalidMetric) {
      this.props.onChange(this.state.metrics);
    }
  }

  _renderMetrics() {
    return this.state.metrics.map((metric, index) => {
      const onMetricChange = (updatedMetric: AggDescriptor) => {
        this.setState(
          {
            metrics: [
              ...this.state.metrics.slice(0, index),
              updatedMetric,
              ...this.state.metrics.slice(index + 1),
            ],
          },
          this._onSubmit
        );
      };

      const onRemove = () => {
        this.setState(
          {
            metrics: [
              ...this.state.metrics.slice(0, index),
              ...this.state.metrics.slice(index + 1),
            ],
          },
          this._onSubmit
        );
      };

      return (
        <div key={index} className="mapMetricEditorPanel__metricEditor">
          <MetricEditor
            onChange={onMetricChange}
            metric={metric}
            fields={this.props.fields}
            metricsFilter={this.props.metricsFilter}
            showRemoveButton={index > 0}
            onRemove={onRemove}
          />
        </div>
      );
    });
  }

  _addMetric = () => {
    this.setState({ metrics: [...this.state.metrics, { type: AGG_TYPE.COUNT }] }, this._onSubmit);
  };

  _renderAddMetricButton() {
    if (!this.props.allowMultipleMetrics) {
      return null;
    }

    return (
      <Fragment>
        <EuiSpacer size="xs" />
        <EuiTextAlign textAlign="center">
          <EuiButtonEmpty onClick={this._addMetric} size="xs" iconType="plusInCircleFilled">
            <FormattedMessage
              id="xpack.maps.metricsEditor.addMetricButtonLabel"
              defaultMessage="Add metric"
            />
          </EuiButtonEmpty>
        </EuiTextAlign>
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        <div className="mapMapLayerPanel__metrics">{this._renderMetrics()}</div>

        {this._renderAddMetricButton()}
      </Fragment>
    );
  }
}
