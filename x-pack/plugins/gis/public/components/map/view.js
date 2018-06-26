/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FlyOut } from '../flyout/index';
import * as ol from 'openlayers';

export class KibanaMap extends React.Component {

  MAP_CENTER = [37.41, 8.82];
  MAP_INIT_ZOOM_LEVEL = 4;

  constructor() {
    super();
  }

  componentDidMount() {
    const olView = new ol.View({
      center: ol.proj.fromLonLat(this.MAP_CENTER),
      zoom: this.MAP_INIT_ZOOM_LEVEL
    });
    this._olMap = new ol.Map({
      target: this.refs.mapContainer,
      layers: [],
      view: olView
    });
    this._addLayers(this.props.olLayers);
  }

  componentWillReceiveProps(props) {
    this._addLayers(props.olLayers);
  }

  _addLayers = (layers) => {
    // TODO: Use layer changes to filter what, if any, layers are removed
    layers.forEach(layer=> {
      this._olMap.removeLayer(layer);
      this._olMap.addLayer(layer.olLayer);
    });
  };

  render() {
    return (
      <div>
        <div className="mapContainer" ref="mapContainer"/>
        <FlyOut/>
      </div>
    );
  }
}
