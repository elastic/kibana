/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer } from './layer';
import { HeatmapStyle } from './styles/heatmap_style';
import * as ol from 'openlayers';
import { OL_GEOJSON_FORMAT } from '../ol_layer_defaults';

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
    //todo: fake, obviously
    return new HeatmapStyle(this._descriptor.style);
  }

  _createCorrespondingOLLayer() {
    const vectorModel = new ol.source.Vector({
      // features: olFeatures
    });
    const placeHolderLayer = new ol.layer.Heatmap({
      source: vectorModel,
    });
    window._phl = placeHolderLayer;
    placeHolderLayer.setVisible(this.isVisible());
    return placeHolderLayer;
  }

  _syncOLData(olLayer) {
    if (!this._descriptor.dataDirty) {
      return;
    }
    const olSource = olLayer.getSource();
    olSource.clear();
    const olFeatures = OL_GEOJSON_FORMAT.readFeatures(this._descriptor.data);
    olSource.addFeatures(olFeatures);
    this._descriptor.dataDirty = false;
  }

  //temporary API method until decoupled data loading falls fully into place
  async updateData() {
    return await this._source.getGeoJsonPoints();
  }

  isLayerLoading() {
    console.log('ch', this._descriptor, this._descriptor.dataDirty);
    return !!this._descriptor.dataDirty;
  }

}
