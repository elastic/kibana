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
import { SOURCE_DATA_ID_ORIGIN } from '../../../common/constants';
import { isRefreshOnlyQuery } from './util/is_refresh_only_query';

const SCALED_PROPERTY_NAME = '__kbn_heatmap_weight__';//unique name to store scaled value for weighting

export class HeatmapLayer extends AbstractLayer {

  static type = 'HEATMAP';

  static createDescriptor(options) {
    const heatmapLayerDescriptor = super.createDescriptor(options);
    heatmapLayerDescriptor.type = HeatmapLayer.type;
    heatmapLayerDescriptor.style = HeatmapStyle.createDescriptor();
    return heatmapLayerDescriptor;
  }

  constructor({ layerDescriptor, source, style }) {
    super({ layerDescriptor, source, style });
    if (!style) {
      const defaultStyle = HeatmapStyle.createDescriptor();
      this._style = new HeatmapStyle(defaultStyle);
    }
  }

  getIndexPatternIds() {
    return this._source.getIndexPatternIds();
  }

  _getPropKeyOfSelectedMetric() {
    const metricfields = this._source.getMetricFields();
    return metricfields[0].propertyKey;
  }

  _getMbLayerId() {
    return this.getId() + '_heatmap';
  }

  getMbLayerIds() {
    return [this._getMbLayerId()];
  }

  syncLayerWithMB(mbMap) {

    const mbSource = mbMap.getSource(this.getId());
    const mbLayerId = this._getMbLayerId();

    if (!mbSource) {
      mbMap.addSource(this.getId(), {
        type: 'geojson',
        data: { 'type': 'FeatureCollection', 'features': [] }
      });


      mbMap.addLayer({
        id: mbLayerId,
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

    mbMap.setLayoutProperty(mbLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    this._style.setMBPaintProperties({
      mbMap,
      layerId: mbLayerId,
      propertyName: SCALED_PROPERTY_NAME,
      resolution: this._source.getGridResolution()
    });
    mbMap.setPaintProperty(mbLayerId, 'heatmap-opacity', this.getAlpha());
    mbMap.setLayerZoomRange(mbLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
  }

  async getBounds(dataFilters) {
    const searchFilters = this._getSearchFilters(dataFilters);
    return await this._source.getBoundsForFilters(searchFilters);
  }

  async syncData({ startLoading, stopLoading, onLoadError, dataFilters }) {
    if (!this.isVisible() || !this.showAtZoomLevel(dataFilters.zoom)) {
      return;
    }

    if (!dataFilters.buffer) {
      return;
    }

    const searchFilters = this._getSearchFilters(dataFilters);

    const sourceDataRequest = this.getSourceDataRequest();
    const meta = sourceDataRequest ? sourceDataRequest.getMeta() : {};

    const isSamePrecision = meta.geogridPrecision === searchFilters.geogridPrecision;

    const isSameTime = _.isEqual(meta.timeFilters, searchFilters.timeFilters);

    const updateDueToRefreshTimer = searchFilters.refreshTimerLastTriggeredAt
      && !_.isEqual(meta.refreshTimerLastTriggeredAt, searchFilters.refreshTimerLastTriggeredAt);

    const updateDueToExtent = this.updateDueToExtent(this._source, meta, searchFilters);

    let updateDueToQuery = false;
    let updateDueToFilters = false;
    if (searchFilters.applyGlobalQuery) {
      updateDueToQuery = !_.isEqual(meta.query, searchFilters.query);
      updateDueToFilters = !_.isEqual(meta.filters, searchFilters.filters);
    } else {
      // Global filters and query are not applied to layer search request so no re-fetch required.
      // Exception is "Refresh" query.
      updateDueToQuery = isRefreshOnlyQuery(meta.query, searchFilters.query);
    }
    const updateDueToLayerQuery = searchFilters.layerQuery
      && !_.isEqual(meta.layerQuery, searchFilters.layerQuery);
    const updateDueToApplyGlobalQuery = meta.applyGlobalQuery !== searchFilters.applyGlobalQuery;

    const updateDueToMetricChange = !_.isEqual(meta.metric, searchFilters.metric);

    if (isSamePrecision
      && isSameTime
      && !updateDueToExtent
      && !updateDueToRefreshTimer
      && !updateDueToQuery
      && !updateDueToLayerQuery
      && !updateDueToApplyGlobalQuery
      && !updateDueToFilters
      && !updateDueToMetricChange
    ) {
      return;
    }

    await this._fetchNewData({ startLoading, stopLoading, onLoadError, searchFilters });
  }

  _getSearchFilters(dataFilters) {
    return {
      ...dataFilters,
      layerQuery: this.getQuery(),
      applyGlobalQuery: this.getApplyGlobalQuery(),
      geogridPrecision: this._source.getGeoGridPrecision(dataFilters.zoom),
      metric: this._getPropKeyOfSelectedMetric()
    };
  }

  async _fetchNewData({ startLoading, stopLoading, onLoadError, searchFilters }) {
    const requestToken = Symbol(`layer-source-refresh: this.getId()`);
    startLoading(SOURCE_DATA_ID_ORIGIN, requestToken, searchFilters);
    try {
      const layerName = await this.getDisplayName();
      const data = await this._source.getGeoJsonPoints(layerName, searchFilters);
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, data);
    } catch (error) {
      onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
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
