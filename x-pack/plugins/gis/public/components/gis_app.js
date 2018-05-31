/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { KibanaMap } from './kibana_map';
import { TMSSource } from '../sources/tms_source';
import { TileLayer } from '../layers/tile_layer';

export class GISApp extends React.Component {

  constructor() {
    super();
    this._kbnMap = null;
  }

  componentDidMount() {

    const tmsSource = new TMSSource({
      urlTemplate: "https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana"
    });

    const tmsLayer = new TileLayer(tmsSource);
    this._kbnMap.addLayer(tmsLayer);
  }


  render() {
    return (<KibanaMap ref={(kbnMap) => this._kbnMap = kbnMap}/>);
  }

}
