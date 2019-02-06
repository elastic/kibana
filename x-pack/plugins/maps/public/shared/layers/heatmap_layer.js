/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { AbstractLayer } from './layer';
import { EuiIcon } from '@elastic/eui';
import { HeatmapStyle } from './styles/heatmap_style';

const SCALED_PROPERTY_NAME = '__kbn_heatmap_weight__';//unique name to store scaled value for weighting

export class HeatmapLayer extends AbstractLayer {

  static type = "HEATMAP";

  static createDescriptor(options) {
    const heatmapLayerDescriptor = super.createDescriptor(options);
    heatmapLayerDescriptor.type = HeatmapLayer.type;
    const defaultStyle = HeatmapStyle.createDescriptor('coarse');
    heatmapLayerDescriptor.style = defaultStyle;
    return heatmapLayerDescriptor;
  }

  constructor({ layerDescriptor, source, style }) {
    super({ layerDescriptor, source, style });
    if (!style) {
      const defaultStyle = HeatmapStyle.createDescriptor('coarse');
      this._style = new HeatmapStyle(defaultStyle);
    }
  }

  getSupportedStyles() {
    return [HeatmapStyle];
  }

  getIndexPatternIds() {
    return this._source.getIndexPatternIds();
  }

  _getPropKeyOfSelectedMetric() {
    const metricfields = this._source.getMetricFields();
    return metricfields[0].propertyKey;
  }

  syncLayerWithMB(mbMap) {

    const mbSource = mbMap.getSource(this.getId());
    const heatmapLayerId = this.getId() + '_heatmap';

    if (!mbSource) {
      mbMap.addSource(this.getId(), {
        type: 'geojson',
        data: { 'type': 'FeatureCollection', 'features': [] }
      });


      mbMap.addLayer({
        id: heatmapLayerId,
        type: 'heatmap',
        source: this.getId(),
        paint: {}
      });
    }

    const mbSourceAfter = mbMap.getSource(this.getId());
    const sourceDataRequest = this.getSourceDataRequest();
    const featureCollection = sourceDataRequest ? sourceDataRequest.getData() : null;
    if (!featureCollection) {
      mbSourceAfter.setData({ 'type': 'FeatureCollection', 'features': [] });
      return;
    }

    const propertyKey = this._getPropKeyOfSelectedMetric();
    const dataBoundToMap = AbstractLayer.getBoundDataForSource(mbMap, this.getId());
    if (featureCollection !== dataBoundToMap) {
      let max = 0;
      for (let i = 0; i < featureCollection.features.length; i++) {
        max = Math.max(featureCollection.features[i].properties[propertyKey], max);
      }
      for (let i = 0; i < featureCollection.features.length; i++) {
        featureCollection.features[i].properties[SCALED_PROPERTY_NAME] = featureCollection.features[i].properties[propertyKey] / max;
      }
      mbSourceAfter.setData(featureCollection);
    }

    mbMap.setLayoutProperty(heatmapLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    this._style.setMBPaintProperties({
      mbMap,
      layerId: heatmapLayerId,
      propertyName: SCALED_PROPERTY_NAME,
      alpha: this.getAlpha(),
      resolution: this._source.getGridResolution()
    });
    mbMap.setLayerZoomRange(heatmapLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
  }

  async getBounds(filters) {
    return await this._source.getBoundsForFilters(filters);
  }

  async syncData({ startLoading, stopLoading, onLoadError, dataFilters }) {
    if (!this.isVisible() || !this.showAtZoomLevel(dataFilters.zoom)) {
      return;
    }

    if (!dataFilters.buffer) {
      return;
    }

    const sourceDataRequest = this.getSourceDataRequest();
    const dataMeta = sourceDataRequest ? sourceDataRequest.getMeta() : {};

    const geogridPrecision = this._source.getGeoGridPrecision(dataFilters.zoom);
    const isSamePrecision = dataMeta.geogridPrecision === geogridPrecision;

    const isSameTime = _.isEqual(dataMeta.timeFilters, dataFilters.timeFilters);

    const updateDueToRefreshTimer = dataFilters.refreshTimerLastTriggeredAt
      && !_.isEqual(dataMeta.refreshTimerLastTriggeredAt, dataFilters.refreshTimerLastTriggeredAt);

    const updateDueToExtent = this.updateDueToExtent(this._source, dataMeta, dataFilters);

    const updateDueToQuery = dataFilters.query
      && !_.isEqual(dataMeta.query, dataFilters.query);

    const metricPropertyKey = this._getPropKeyOfSelectedMetric();
    const updateDueToMetricChange = !_.isEqual(dataMeta.metric, metricPropertyKey);

    if (isSamePrecision
      && isSameTime
      && !updateDueToExtent
      && !updateDueToRefreshTimer
      && !updateDueToQuery
      && !updateDueToMetricChange
    ) {
      return;
    }

    const newDataMeta = {
      ...dataFilters,
      geogridPrecision,
      metric: metricPropertyKey
    };
    await this._fetchNewData({ startLoading, stopLoading, onLoadError, dataMeta: newDataMeta });
  }

  async _fetchNewData({ startLoading, stopLoading, onLoadError, dataMeta }) {
    const { geogridPrecision, timeFilters, buffer, query } = dataMeta;
    const requestToken = Symbol(`layer-source-refresh: this.getId()`);
    startLoading('source', requestToken, dataMeta);
    try {
      const layerName = await this.getDisplayName();
      const data = await this._source.getGeoJsonPoints({ layerName }, {
        geogridPrecision,
        buffer,
        timeFilters,
        query,
      });
      stopLoading('source', requestToken, data);
    } catch (error) {
      onLoadError('source', requestToken, error.message);
    }
  }

  getLayerTypeIconName() {
    return 'heatmap';
  }

  getIcon() {
    return (
      <EuiIcon
        type={this.getLayerTypeIconName()}
      />
    );
  }

}
