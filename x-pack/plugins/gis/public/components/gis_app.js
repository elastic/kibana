/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { KibanaMap } from './kibana_map';
import { LayerControl } from './layer_control';
import { TMSSource } from '../sources/tms_source';
import { TileLayer  } from '../layers/tile_layer';

export class GISApp extends React.Component {

  constructor() {
    super();
    this._kbnMap = null;
    this._layerControl = null;
  }

  componentDidMount() {

    this._layerControl.setKbnMap(this._kbnMap);

    const tmsSource = new TMSSource({
      urlTemplate: "https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana"
    });

    const tmsLayer = new TileLayer(tmsSource);
    this._kbnMap.addLayer(tmsLayer);

  }


  render() {
    return (
      <div className="wrapper">
        <KibanaMap ref={(kbnMap) => this._kbnMap = kbnMap}/>
        <LayerControl ref={(layerControl) => this._layerControl = layerControl}/>
      </div>
    );
  }

}
