/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ALayer } from './layer';
import * as ol from 'openlayers';

import { EuiIcon } from '@elastic/eui';


export class VectorLayer extends ALayer {

  constructor(vectorSource) {
    super();
    this._vectorSource = vectorSource;
  }

  getType() {
    return "Vector";
  }

  getLayerName() {
    return this._vectorSource.getDisplayName();
  }

  renderSmallLegend() {
    return (<EuiIcon type="vector" />);
  }

  async getOLLayer() {

    const geojsonFormat = new ol.format.GeoJSON({
      featureProjection: 'EPSG:3857'
    });
    const featureCollection = await this._vectorSource.getGeoJsonFeatureCollection();
    const olFeatures = geojsonFormat.readFeatures(featureCollection);

    const vectorModel = new ol.source.Vector({
      features: olFeatures
    });
    return new ol.layer.Vector({
      source: vectorModel
    });

  }
}
