/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { ResizeChecker } from 'ui/resize_checker';
import { syncLayerOrder, removeOrphanedSourcesAndLayers, createMbMapInstance } from './utils';
import { inspectorAdapters } from '../../../kibana_services';
import { DECIMAL_DEGREES_PRECISION, ZOOM_PRECISION } from '../../../../common/constants';

export class MBMapContainer extends React.Component {

  constructor() {
    super();
    this._mbMap = null;
    this._listeners = new Map(); // key is mbLayerId, value eventHandlers map
  }

  _debouncedSync = _.debounce(() => {
    if (this._isMounted) {
      this._syncMbMapWithLayerList();
      this._syncMbMapWithInspector();
    }
  }, 256);

  _getMapState() {
    const zoom = this._mbMap.getZoom();
    const mbCenter = this._mbMap.getCenter();
    const mbBounds = this._mbMap.getBounds();
    return {
      zoom: _.round(zoom, ZOOM_PRECISION),
      center: {
        lon: _.round(mbCenter.lng, DECIMAL_DEGREES_PRECISION),
        lat: _.round(mbCenter.lat, DECIMAL_DEGREES_PRECISION)
      },
      extent: {
        minLon: _.round(mbBounds.getWest(), DECIMAL_DEGREES_PRECISION),
        minLat: _.round(mbBounds.getSouth(), DECIMAL_DEGREES_PRECISION),
        maxLon: _.round(mbBounds.getEast(), DECIMAL_DEGREES_PRECISION),
        maxLat: _.round(mbBounds.getNorth(), DECIMAL_DEGREES_PRECISION)
      }
    };
  }

  componentDidMount() {
    this._initializeMap();
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._checker.destroy();
    if (this._mbMap) {
      this._mbMap.remove();
      this._mbMap = null;
    }
    this.props.onMapDestroyed();
  }

  async _initializeMap() {
    this._mbMap = await createMbMapInstance(this.refs.mapContainer, this.props.goto);

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

    // moveend callback is debounced to avoid updating map extent state while map extent is still changing
    // moveend is fired while the map extent is still changing in the following scenarios
    // 1) During opening/closing of layer details panel, the EUI animation results in 8 moveend events
    // 2) Setting map zoom and center from goto is done in 2 API calls, resulting in 2 moveend events
    this._mbMap.on('moveend', _.debounce(() => {
      this.props.extentChanged(this._getMapState());
    }, 100));

    const throttledSetMouseCoordinates = _.throttle(e => {
      this.props.setMouseCoordinates({
        lat: _.round(e.lngLat.lat, DECIMAL_DEGREES_PRECISION),
        lon: _.round(e.lngLat.lng, DECIMAL_DEGREES_PRECISION)
      });
    }, 100);
    this._mbMap.on('mousemove', throttledSetMouseCoordinates);
    this._mbMap.on('mouseout', () => {
      throttledSetMouseCoordinates.cancel(); // cancel any delayed setMouseCoordinates invocations
      this.props.clearMouseCoordinates();
    });

    this.props.onMapReady(this._getMapState());
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
      goto,
      clearGoto,
    } = this.props;

    if (!isMapReady || !goto) {
      return;
    }

    clearGoto();
    this._mbMap.setZoom(goto.zoom);
    this._mbMap.setCenter({
      lng: goto.lon,
      lat: goto.lat
    });
  };

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
  };

  _syncMbMapWithInspector = () => {
    if (!this.props.isMapReady) {
      return;
    }

    const stats = {
      center: this._mbMap.getCenter().toArray(),
      zoom: this._mbMap.getZoom(),

    };
    inspectorAdapters.map.setMapState({
      stats,
      style: this._mbMap.getStyle(),
    });
  };

  render() {
    // do not debounce syncing zoom and center
    this._syncMbMapWithMapState();
    this._debouncedSync();
    return (
      <div id={'mapContainer'} className="mapContainer" ref="mapContainer"/>
    );
  }
}
