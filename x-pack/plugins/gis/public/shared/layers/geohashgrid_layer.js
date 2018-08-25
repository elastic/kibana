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
    const vectorModel = new ol.source.Vector({});
    const placeHolderLayer = new ol.layer.Heatmap({
      source: vectorModel,
    });
    placeHolderLayer.setVisible(this.isVisible());
    return placeHolderLayer;
  }

  _syncOLData(olLayer) {
    if (!this._descriptor.data) {
      return;
    }
    //ugly, but it's what we have now
    //think about stateful-shim that mirrors OL (or Mb) that can keep these links
    //but for now, the OpenLayers object model remains our source of truth
    if (this._descriptor.data === olLayer.__kbn_data__) {
      return;
    } else {
      olLayer.__kbn_data__ = this._descriptor.data;
    }

    const olSource = olLayer.getSource();
    olSource.clear();
    const olFeatures = OL_GEOJSON_FORMAT.readFeatures(this._descriptor.data);
    olSource.addFeatures(olFeatures);
  }

  //temporary API method until decoupled data loading falls fully into place
  async updateData() {
    return await this._source.getGeoJsonPoints();
  }

  isLayerLoading() {
    return !!this._descriptor.dataDirty;
  }

}
