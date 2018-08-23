/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AddLayerPanel } from '../layer_addpanel/index';
import * as ol from 'openlayers';

export class OLMapContainer extends React.Component {

  componentDidMount() {
    this.props.olMap.setTarget(this.refs.mapContainer);
    this.props.olMap.on('moveend', () => {
      const olView = this.props.olMap.getView();
      const zoom = olView.getZoom();
      const extentInWorldReference = olView.calculateExtent(this.props.olMap.getSize());
      const extentInLonLat = ol.proj.transformExtent(extentInWorldReference, 'EPSG:3857', 'EPSG:4326');
      this.props.extentChanged({
        zoom: zoom,
        extent: extentInLonLat
      });
    });
  }

  render() {
    return (
      <div>
        <div className="mapContainer" ref="mapContainer"/>
        <AddLayerPanel/>
      </div>
    );
  }
}
