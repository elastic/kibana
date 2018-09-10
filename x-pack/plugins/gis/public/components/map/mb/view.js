/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export class MBMapContainer extends React.Component {

  _getMapState() {
    const zoom = this.props.mbMap.getZoom();
    const center = this.props.mbMap.getCenter();
    const mapState =  {
      zoom: zoom,
      center: [center.lng, center.lat]
    };
    return mapState;
  }

  componentDidMount() {
    const container = this.props.mbMap.getContainer();
    container.style.width = '100%';
    container.style.height = '100%';
    this.refs.mapContainer.appendChild(container);
    this.props.mbMap.resize();

    const newMapState = this._getMapState();
    this.props.initialize(newMapState);
  }

  render() {
    return (
      <div>
        <div className="mapContainer" ref="mapContainer"/>
      </div>
    );
  }
}
