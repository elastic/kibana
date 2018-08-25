/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer } from './layer';
import { HeatmapStyle } from './styles/heatmap_style';
import * as ol from 'openlayers';
import { endDataLoad, startDataLoad } from '../../actions/store_actions';

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

  //temporary API method until decoupled data loading falls fully into place
  async initializeData(mapState, requestToken, dispatch) {
    dispatch(startDataLoad(this.getId(), mapState, requestToken));
    const data = await this._source.getGeoJsonPoints();
    dispatch(endDataLoad(this.getId(), data, requestToken));
  }

  isLayerLoading() {
    return !!this._descriptor.dataDirty;
  }

  syncDataToExtent() {
    // console.log('must compare extents and dispatch if necessary', extent, dispatch);
  }
}
