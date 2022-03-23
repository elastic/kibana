/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, Component } from 'react';

import uuid from 'uuid/v4';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiSpacer, EuiComboBoxOptionOption, EuiTitle } from '@elastic/eui';
import { getDataViewNotFoundMessage } from '../../../../common/i18n_getters';
import { AGG_TYPE, GRID_RESOLUTION, LAYER_TYPE, RENDER_AS } from '../../../../common/constants';
import { MetricsEditor } from '../../../components/metrics_editor';
import { getIndexPatternService } from '../../../kibana_services';
import { ResolutionEditor } from './resolution_editor';
import { isMetricCountable } from '../../util/is_metric_countable';
import { IndexPatternField, indexPatterns } from '../../../../../../../src/plugins/data/public';
import { RenderAsSelect } from './render_as_select';
import { AggDescriptor } from '../../../../common/descriptor_types';
import { OnSourceChangeArgs } from '../source';
import { clustersTitle, heatmapTitle } from './es_geo_grid_source';

interface Props {
  currentLayerType?: string;
  indexPatternId: string;
  onChange: (...args: OnSourceChangeArgs[]) => Promise<void>;
  metrics: AggDescriptor[];
  renderAs: RENDER_AS;
  resolution: GRID_RESOLUTION;
}

interface State {
  metricsEditorKey: string;
  fields: IndexPatternField[];
  loadError?: string;
}

export class UpdateSourceEditor extends Component<Props, State> {
  private _isMounted?: boolean;
  state: State = {
    fields: [],
    metricsEditorKey: uuid(),
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadFields();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadFields() {
    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().get(this.props.indexPatternId);
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          loadError: getDataViewNotFoundMessage(this.props.indexPatternId),
        });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      fields: indexPattern.fields.filter((field) => !indexPatterns.isNestedField(field)),
    });
  }

  _onMetricsChange = (metrics: AggDescriptor[]) => {
    this.props.onChange({ propName: 'metrics', value: metrics });
  };

  _onResolutionChange = async (resolution: GRID_RESOLUTION, metrics: AggDescriptor[]) => {
    let newLayerType;
    if (
      this.props.currentLayerType === LAYER_TYPE.GEOJSON_VECTOR ||
      this.props.currentLayerType === LAYER_TYPE.MVT_VECTOR
    ) {
      newLayerType =
        resolution === GRID_RESOLUTION.SUPER_FINE
          ? LAYER_TYPE.MVT_VECTOR
          : LAYER_TYPE.GEOJSON_VECTOR;
    }

    await this.props.onChange(
      { propName: 'metrics', value: metrics },
      { propName: 'resolution', value: resolution, newLayerType }
    );

    // Metrics editor persists metrics in state.
    // Reset metricsEditorKey to force new instance and new internal state with latest metrics
    this.setState({ metricsEditorKey: uuid() });
  };

  _onRequestTypeSelect = (requestType: RENDER_AS) => {
    this.props.onChange({ propName: 'requestType', value: requestType });
  };

  _getMetricsFilter() {
    return this.props.currentLayerType === LAYER_TYPE.HEATMAP
      ? (metric: EuiComboBoxOptionOption<AGG_TYPE>) => {
          // these are countable metrics, where blending heatmap color blobs make sense
          return metric.value ? isMetricCountable(metric.value) : false;
        }
      : (metric: EuiComboBoxOptionOption<AGG_TYPE>) => {
          // terms aggregation is not supported with Elasticsearch _mvt endpoint
          // The goal is to remove GeoJSON ESGeoGridSource implemenation and only have MVT ESGeoGridSource implemenation
          // First step is to deprecate terms aggregation for ESGeoGridSource
          // and prevent new uses of terms aggregation for ESGeoGridSource
          return metric.value !== AGG_TYPE.TERMS;
        };
  }

  _renderMetricsPanel() {
    return (
      <EuiPanel>
        <EuiTitle size="xs">
          <h6>
            <FormattedMessage id="xpack.maps.source.esGrid.metricsLabel" defaultMessage="Metrics" />
          </h6>
        </EuiTitle>
        <EuiSpacer size="m" />
        <MetricsEditor
          key={this.state.metricsEditorKey}
          allowMultipleMetrics={this.props.currentLayerType !== LAYER_TYPE.HEATMAP}
          metricsFilter={this._getMetricsFilter()}
          fields={this.state.fields}
          metrics={this.props.metrics}
          onChange={this._onMetricsChange}
        />
      </EuiPanel>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderMetricsPanel()}
        <EuiSpacer size="s" />

        <EuiPanel>
          <EuiTitle size="xs">
            <h6>
              {this.props.currentLayerType === LAYER_TYPE.HEATMAP ? heatmapTitle : clustersTitle}
            </h6>
          </EuiTitle>
          <EuiSpacer size="m" />
          <ResolutionEditor
            isHeatmap={this.props.currentLayerType === LAYER_TYPE.HEATMAP}
            resolution={this.props.resolution}
            onChange={this._onResolutionChange}
            metrics={this.props.metrics}
          />
          <RenderAsSelect
            isColumnCompressed
            renderAs={this.props.renderAs}
            onChange={this._onRequestTypeSelect}
          />
        </EuiPanel>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
}
