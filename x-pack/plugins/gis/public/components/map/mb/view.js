/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { ResizeChecker } from 'ui/resize_checker';
import { syncLayerOrder, removeOrphanedSourcesAndLayers, createMbMapInstance } from './utils';

export class MBMapContainer extends React.Component {

  constructor() {
    super();
    this._mbMap = null;
    this._listeners = new Map(); // key is mbLayerId, value eventHandlers map
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

  componentDidMount() {
    this._initializeMap();
  }

  componentWillUnmount() {
    this._checker.destroy();
    if (this._mbMap) {
      this._mbMap.remove();
      this._mbMap = null;
    }
  }

  async _initializeMap() {
    this._mbMap = await createMbMapInstance(this.refs.mapContainer);

    // Override mapboxgl.Map "on" and "removeLayer" methods so we can track layer listeners
    // Tracked layer listerners are used to clean up event handlers
    const originalMbBoxOnFunc = this._mbMap.on;
    const originalMbBoxRemoveLayerFunc = this._mbMap.removeLayer;
    this._mbMap.on = (...args) => {
      // args do not identify layer so there is nothing to track
      if (args.length <= 2) {
        originalMbBoxOnFunc.apply(this._mbMap, args);
        return;
      }

      const eventType = args[0];
      const mbLayerId = args[1];
      const handler = args[2];
      this._addListener(eventType, mbLayerId, handler);

      originalMbBoxOnFunc.apply(this._mbMap, args);
    };
    this._mbMap.removeLayer = (id) => {
      this._removeListeners(id);
      originalMbBoxRemoveLayerFunc.apply(this._mbMap, [id]);
    };

    this.assignSizeWatch();
    this._mbMap.on('moveend', () => {
      this.props.extentChanged(this._getMapState());
    });
    this.props.mapReady();
  }

  _addListener(eventType, mbLayerId, handler) {
    this._removeListener(eventType, mbLayerId);

    const eventHandlers = !this._listeners.has(mbLayerId)
      ? new Map()
      : this._listeners.get(mbLayerId);
    eventHandlers.set(eventType, handler);
    this._listeners.set(mbLayerId, eventHandlers);
  }

  _removeListeners(mbLayerId) {
    if (this._listeners.has(mbLayerId)) {
      const eventHandlers = this._listeners.get(mbLayerId);
      eventHandlers.forEach((value, eventType) => {
        this._removeListener(eventType, mbLayerId);
      });
      this._listeners.delete(mbLayerId);
    }
  }

  _removeListener(eventType, mbLayerId) {
    if (this._listeners.has(mbLayerId)) {
      const eventHandlers = this._listeners.get(mbLayerId);
      if (eventHandlers.has(eventType)) {
        this._mbMap.off(eventType, mbLayerId, eventHandlers.get(eventType));
        eventHandlers.delete(eventType);
      }
    }
  }

  assignSizeWatch() {
    this._checker = new ResizeChecker(this.refs.mapContainer);
    this._checker.on('resize', (() => {
      let lastWidth = window.innerWidth;
      let lastHeight = window.innerHeight;
      return () => {
        if (lastWidth === window.innerWidth
          && lastHeight === window.innerHeight && this._mbMap) {
          this._mbMap.resize();
        }
        lastWidth = window.innerWidth;
        lastHeight = window.innerHeight;
      };
    })());
  }

  _syncMbMapWithMapState = () => {
    const {
      isMapReady,
      mapState,
    } = this.props;

    if (!isMapReady) {
      return;
    }

    const zoom = this._mbMap.getZoom();
    if (typeof mapState.zoom === 'number' && mapState.zoom !== zoom) {
      this._mbMap.setZoom(mapState.zoom);
    }

    const center = this._mbMap.getCenter();
    if (mapState.center && !_.isEqual(mapState.center, { lon: center.lng, lat: center.lat })) {
      this._mbMap.setCenter({
        lng: mapState.center.lon,
        lat: mapState.center.lat
      });
    }
  }

  _syncMbMapWithLayerList = () => {
    const {
      isMapReady,
      layerList,
    } = this.props;

    if (!isMapReady) {
      return;
    }
    removeOrphanedSourcesAndLayers(this._mbMap, layerList);
    layerList.forEach((layer) => {
      layer.syncLayerWithMB(this._mbMap);
    });
    syncLayerOrder(this._mbMap, layerList);
  }

  render() {
    this._syncMbMapWithMapState();
    this._syncMbMapWithLayerList();

    return (
      <div id={'mapContainer'} className="mapContainer" ref="mapContainer"/>
    );
  }
}
