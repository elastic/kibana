/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer } from './layer';
import { HeatmapStyle } from './styles/heatmap_style';
import * as ol from 'openlayers';
import { endDataLoad, startDataLoad } from '../../actions/store_actions';




const ZOOM_TO_PRECISION = {
  "0": 1,
  "1": 2,
  "2": 2,
  "3": 2,
  "4": 3,
  "5": 3,
  "6": 4,
  "7": 4,
  "8": 4,
  "9": 5,
  "10": 5,
  "11": 6,
  "12": 6,
  "13": 6,
  "14": 7,
  "15": 7,
  "16": 8,
  "17": 8,
  "18": 8,
  "19": 9,
  "20": 9,
  "21": 10,
  "22": 10,
  "23": 10,
  "24": 11,
  "25": 11,
  "26": 12,
  "27": 12,
  "28": 12,
  "29": 12,
  "30": 12
};


export class GeohashGridLayer extends ALayer {

  static type = "GEOHASH_GRID";

  static createDescriptor(options) {
    const heatmapLayerDescriptor = super.createDescriptor(options);
    heatmapLayerDescriptor.type = GeohashGridLayer.type;
    return heatmapLayerDescriptor;
  }

  getSupportedStyles() {
    return [HeatmapStyle];
  }

  getCurrentStyle() {
    //todo
    return new HeatmapStyle(this._descriptor.style);
  }

  _createCorrespondingOLLayer() {
    const vectorModel = new ol.source.Vector({});
    const placeHolderLayer = new ol.layer.Heatmap({
      source: vectorModel,
    });
    placeHolderLayer.setVisible(this.isVisible());
    return placeHolderLayer;
  }

  _syncOLData(olLayer) {
    return this._syncWithCurrentDataAsVectors(olLayer);
  }

  async _fetchNewData(mapState, requestToken, precision, dispatch) {
    dispatch(startDataLoad(this.getId(), {
      mapState: mapState,
      precision: precision,
      extent: mapState.extent
    }, requestToken));
    const data = await this._source.getGeoJsonPoints(precision, mapState.extent);
    dispatch(endDataLoad(this.getId(), data, requestToken));
  }

  //temporary API method until decoupled data loading falls fully into place
  async initializeData(mapState, requestToken, dispatch) {
    const precision = ZOOM_TO_PRECISION[Math.round(mapState.zoom)];
    return await this._fetchNewData(mapState, requestToken, precision, dispatch);
  }

  isLayerLoading() {
    return !!this._descriptor.dataDirty;
  }

  syncDataToExtent(mapState, requestToken, dispatch) {
    //todo: use "collar" around map extent, so small pans dont trigger new request
    const targetPrecision = ZOOM_TO_PRECISION[Math.round(mapState.zoom)];
    if (this._descriptor.dataMeta && this._descriptor.dataMeta.extent) {
      const isContained = ol.extent.containsExtent(this._descriptor.dataMeta.extent, mapState.extent);
      const samePrecision = this._descriptor.dataMeta.precision === targetPrecision;
      if (samePrecision && isContained) {
        return;
      }
    }
    return this._fetchNewData(mapState, requestToken, targetPrecision, dispatch);
  }
}
