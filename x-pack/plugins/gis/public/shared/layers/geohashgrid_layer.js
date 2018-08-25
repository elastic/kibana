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
    const olFeatures = OL_GEOJSON_FORMAT.readFeatures(this._descriptor.source);
    const vectorModel = new ol.source.Vector({
      features: olFeatures
    });
    const placeHolderLayer = new ol.layer.Heatmap({
      source: vectorModel,
    });
    placeHolderLayer.setVisible(this.isVisible());
    return placeHolderLayer;
  }

}
