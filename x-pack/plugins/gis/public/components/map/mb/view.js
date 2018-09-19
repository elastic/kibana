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
    const center = this._mbMap.getCenter();
    const bounds = this._mbMap.getBounds();
    return {
      zoom: zoom,
      center: [center.lng, center.lat],
      extent: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
    };
  }

  componentWillUnmount() {
    console.warn('Should tear down all resources of this component, including this._mbMap');
  }

  componentDidMount() {
    this._mbMap = createGlobalMbMapInstance(this.refs.mapContainer);
    this.assignSizeWatch();
    this._mbMap.on('moveend', () => {
      const newMapState = this._getMapState();
      this.props.extentChanged(newMapState);
    });
    this._mbMap.on('load', () => {
      //todo: under consideration if we need this
      const newMapState = this._getMapState();
      this.props.extentChanged(newMapState);
    });
    const newMapState = this._getMapState();
    this.props.initialize(newMapState);
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
      <div>
        <div id={'mapContainer'} className="mapContainer" ref="mapContainer"/>
      </div>
    );
  }
}
