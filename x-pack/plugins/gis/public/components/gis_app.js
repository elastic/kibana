/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { KibanaMap } from './kibana_map';
import { LayerControl } from './layer_control';
import { TMSSource } from '../sources/tms_source';
import { EMSVectorSource } from '../sources/ems_vector_source';
import { EMSTMSSource } from '../sources/ems_tms_source';
import { TileLayer } from '../layers/tile_layer';
import { VectorLayer } from '../layers/vector_layer';

export class GISApp extends React.Component {

  constructor() {
    super();
    this._kbnMap = null;
    this._layerControl = null;
  }


  async _createPlaceholders() {

    //todo: some hardcoded example layers
    const defaultEmsTMSSource = new EMSTMSSource({
      kbnCoreAPI: this.props.kbnCoreAPI,
      serviceId: "road_map"
    });
    const tmsLayer = new TileLayer(defaultEmsTMSSource);
    await this._kbnMap.addLayer(tmsLayer);
    const osmSource = new TMSSource({
      urlTemplate: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
    });
    const tmsLayer2 = new TileLayer(osmSource);
    await this._kbnMap.addLayer(tmsLayer2);

    const vectorSource = new EMSVectorSource({
      kbnCoreAPI: this.props.kbnCoreAPI,
      layerName: "World Countries"
    });

    const vectorLayer = new VectorLayer(vectorSource);
    await this._kbnMap.addLayer(vectorLayer);


  }


  componentDidMount() {
    this._layerControl.setKbnMap(this._kbnMap);
    this._createPlaceholders();
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
