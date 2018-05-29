/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as ol from 'openlayers';


import {
} from '@elastic/eui';

export class GISApp extends React.Component {

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

    const olTileLayer = new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: `https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana"`
      })
    });
    this._olMap.addLayer(olTileLayer);
  }

  render() {
    return (
      <div>
        <div id="mapContainer" ref="mapContainer" />
      </div>
    );
  }

}
