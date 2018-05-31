/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as ol from 'openlayers';

import {} from '@elastic/eui';

export class KibanaMap extends React.Component {

  constructor() {
    super();
  }

  componentDidMount() {
    const olView = new ol.View({
      center: ol.proj.fromLonLat([37.41, 8.82]),
      zoom: 4
    });
    this._olMap = new ol.Map({
      target: this.refs.mapContainer,
      layers: [],
      view: olView
    });
  }

  async addLayer(layer) {
    const olLayer = await layer.getOLLayer();
    this._olMap.addLayer(olLayer);
  }

  render() {
    return (
      <div>
        <div className="mapContainer" ref="mapContainer"/>
      </div>
    );
  }

}
