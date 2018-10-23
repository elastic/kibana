/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createGlobalMbMapInstance } from './global_mb_map';
import { ResizeChecker } from 'ui/resize_checker';

export class MBMapContainer extends React.Component {

  constructor() {
    super();
    this._mbMap = null;
  }

  _getMapState() {
    const zoom = this._mbMap.getZoom();
    const mbCenter = this._mbMap.getCenter();
    const mbBounds = this._mbMap.getBounds();
    return {
      zoom: zoom,
      center: {
        lon: mbCenter.lng,
        lat: mbCenter.lat
      },
      extent: {
        min_lon: mbBounds.getWest(),
        min_lat: mbBounds.getSouth(),
        max_lon: mbBounds.getEast(),
        max_lat: mbBounds.getNorth()
      }
    };
  }

  componentWillUnmount() {
    console.warn('Should tear down all resources of this component, including this._mbMap');
  }

  async _initializeMap() {
    this._mbMap = await createGlobalMbMapInstance(this.refs.mapContainer);
    this.assignSizeWatch();
    this._mbMap.on('moveend', () => {
      const newMapState = this._getMapState();
      this.props.extentChanged(newMapState);
    });
    const newMapState = this._getMapState();
    this.props.initialize(newMapState);
  }

  componentDidMount() {
    this._initializeMap();
  }

  assignSizeWatch() {
    const checker = new ResizeChecker(this.refs.mapContainer);
    checker.on('resize', (() => {
      let lastWidth = window.innerWidth;
      let lastHeight = window.innerHeight;
      return () => {
        if (lastWidth === window.innerWidth
          && lastHeight === window.innerHeight) {
          this._mbMap.resize();
        }
        lastWidth = window.innerWidth;
        lastHeight = window.innerHeight;
      };
    })());
  }

  render() {
    return (
      <div id={'mapContainer'} className="mapContainer" ref="mapContainer"/>
    );
  }
}
