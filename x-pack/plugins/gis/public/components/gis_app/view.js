/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { OLMapContainer } from '../map/ol';
import { MBMapContainer } from '../map/mb';
import { LayerControl } from '../layer_control/index';


//todo: DEBUG PURPOSES ONLY!
const MAP_LIBS = { "OPEN_LAYERS": "OPEN_LAYERS", "MAPBOX_GL": "MAPBOX_GL" };
const SELECTED_MAPLIB = MAP_LIBS.MAPBOX_GL;

export function GISApp() {

  const MapImp = SELECTED_MAPLIB === MAP_LIBS.OPEN_LAYERS ? <OLMapContainer/> : <MBMapContainer/>;

  return (
    <div className="wrapper">
      {MapImp}
      <LayerControl/>
    </div>
  );
}
