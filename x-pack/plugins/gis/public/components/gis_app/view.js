/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { KibanaMap } from '../map';
import { TMSSource } from '../map/layers/sources/tms_source';
import { EMSVectorSource } from '../map/layers/sources/ems_vector_source';
import { EMSTMSSource } from '../map/layers/sources/ems_tms_source';
import { KbnYmlTMSSource } from '../map/layers/sources/kbnyml_tms_source';
import { KbnYmlVectorSource } from '../map/layers/sources/kbnyml_vector_source';

import { TileLayer } from '../map/layers/tile_layer';
import { VectorLayer } from '../map/layers/vector_layer';
import { LayerControl } from '../layer_control/index';

export class GISApp extends React.Component {

  constructor() {
    super();
    this._kbnMap = null;
  }

  async _createPlaceholders() {

    //todo: some hardcoded example layers
    const emsTMSSource = new EMSTMSSource({
      kbnCoreAPI: this.props.kbnCoreAPI,
      serviceId: "road_map"
    });
    const tmsLayer = new TileLayer(emsTMSSource);
    await this._kbnMap.addLayer(tmsLayer);
    const osmSource = new TMSSource({
      urlTemplate: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
    });

    const osmLayer = new TileLayer(osmSource);
    await this._kbnMap.addLayer(osmLayer);

    try {
      const kbnymlTmsSource = new KbnYmlTMSSource({ kbnCoreAPI: this.props.kbnCoreAPI });
      const tmsLayer = new TileLayer(kbnymlTmsSource);
      await this._kbnMap.addLayer(tmsLayer);
    } catch(e) {
      console.error(e);
      console.warn('Missing map.tilemap configuration in yml');
    }

    const vectorSource = new EMSVectorSource({
      kbnCoreAPI: this.props.kbnCoreAPI,
      layerName: "World Countries"
    });

    const vectorLayer = new VectorLayer(vectorSource);
    await this._kbnMap.addLayer(vectorLayer);


    try {
      const vectorSource = new KbnYmlVectorSource({
        layerName: "foobar (self hosted)",
        kbnCoreAPI: this.props.kbnCoreAPI
      });

      const vectorLayer = new VectorLayer(vectorSource);
      await this._kbnMap.addLayer(vectorLayer);
    } catch(e) {
      console.error(e);
      console.warn('Missing regionmap configuration in yml');
    }

  }

  render() {
    return (
      <div className="wrapper">
        <KibanaMap ref={(kbnMap) => this._kbnMap = kbnMap}/>
        <LayerControl/>
      </div>
    );
  }

}
