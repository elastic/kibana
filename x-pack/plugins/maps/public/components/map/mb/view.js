/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { ResizeChecker } from 'ui/resize_checker';
import { syncLayerOrder, removeOrphanedSourcesAndLayers, createMbMapInstance } from './utils';
import { DECIMAL_DEGREES_PRECISION, ZOOM_PRECISION } from '../../../../common/constants';
import mapboxgl from 'mapbox-gl';
import { FeatureTooltip } from '../feature_tooltip';

export class MBMapContainer extends React.Component {

  constructor() {
    super();
    this._mbMap = null;
    this._tooltipContainer = document.createElement('div');
    this._listeners = new Map(); // key is mbLayerId, value eventHandlers map
    this._activeFeature = null;
    this._isTooltipOpen = false;
    this._mbPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });
    this._layersWithListeners = [];
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
    if (this._checker) {
      this._checker.destroy();
    }
    if (this._mbMap) {
      this._layersWithListeners.forEach(listeners => {
        this._removeListenersFromMap(listeners);
      });
      this._mbMap.remove();
      this._mbMap = null;
      this._layersWithListeners = null;
      this._tooltipContainer = null;
      this._activeFeature = null;
    }
    this.props.onMapDestroyed();
  }

  async _initializeMap() {


    this._mbMap = await createMbMapInstance(this.refs.mapContainer, this.props.goto ? this.props.goto.center : null);

    if (!this._isMounted) {
      return;
    }
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


    //todo :these callbacks should be remove on destroy
    // moveend callback is debounced to avoid updating map extent state while map extent is still changing
    // moveend is fired while the map extent is still changing in the following scenarios
    // 1) During opening/closing of layer details panel, the EUI animation results in 8 moveend events
    // 2) Setting map zoom and center from goto is done in 2 API calls, resulting in 2 moveend events
    this._mbMap.on('moveend', _.debounce(() => {
      this.props.extentChanged(this._getMapState());
    }, 100));

    const throttledSetMouseCoordinates = _.throttle(e => {
      this.props.setMouseCoordinates({
        lat: e.lngLat.lat,
        lon: e.lngLat.lng
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

  async _showTooltip(feature, eventLngLat, mbLayerId)  {

    let popupAnchorLocation = eventLngLat; // default popup location to mouse location
    if (feature.geometry.type === 'Point') {
      const coordinates = feature.geometry.coordinates.slice();

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(eventLngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += eventLngLat.lng > coordinates[0] ? 360 : -360;
      }

      popupAnchorLocation = coordinates;
    }

    const layer = this._getLayer(mbLayerId);
    const properties = await layer._getPropertiesForTooltip(feature);
    // const properties = {
    //   'foo': 'bar'
    // };

    ReactDOM.render(
      React.createElement(
        FeatureTooltip, {
          properties: properties,
        }
      ),
      this._tooltipContainer
    );

    this._mbPopup.setLngLat(popupAnchorLocation)
      .setDOMContent(this._tooltipContainer)
      .addTo(this._mbMap);
  }

  _syncTooltipState() {
    //todo
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

    if (goto.bounds) {
      //clamping ot -89/89 latitudes since Mapboxgl does not seem to handle bounds that contain the poles (logs errors to the console when using -90/90)
      const lnLatBounds = new mapboxgl.LngLatBounds(
        new mapboxgl.LngLat(clamp(goto.bounds.min_lon, -180, 180), clamp(goto.bounds.min_lat, -89, 89)),
        new mapboxgl.LngLat(clamp(goto.bounds.max_lon, -180, 180), clamp(goto.bounds.max_lat, -89, 89)),
      );
      //maxZoom ensure we're not zooming in too far on single points or small shapes
      //the padding is to avoid too tight of a fit around edges
      this._mbMap.fitBounds(lnLatBounds, { maxZoom: 17, padding: 16 });
    } else if (goto.center) {
      this._mbMap.setZoom(goto.center.zoom);
      this._mbMap.setCenter({
        lng: goto.center.lon,
        lat: goto.center.lat
      });
    }


  };

  _getMbLayerIdsForAllLayers() {
    return this.props.layerList.reduce((mbLayerIds, layer) => {
      return mbLayerIds.concat(layer.getMbLayerIds());
    }, []);
  }

  _removeListenersFromMap({ layerId, mouseEnterListener, mouseLeaveListener, mouseMoveListener }) {
    this._mbMap.off('mouseenter', layerId, mouseEnterListener);
    this._mbMap.off('mouseleave', layerId, mouseLeaveListener);
    this._mbMap.off('mousemove', layerId, mouseMoveListener);
  }


  _getLayer(mbLayerId) {
    return this.props.layerList.find((layer) => {
      const mbLayerIds = layer.getMbLayerIds();
      return mbLayerIds.indexOf(mbLayerId) > -1;
    });
  }

  _registerAndUnregisterLayerListeners() {

    //remove listeners from removed layers
    const mbLayerIds = this._getMbLayerIdsForAllLayers();
    this._layersWithListeners = this._layersWithListeners.filter((listeners) => {
      const foundLayerId = mbLayerIds.find(mbLayerId => {
        return mbLayerId === listeners.layerId;
      });
      if (foundLayerId) {
        return true;//retain
      }
      this._removeListenersFromMap(listeners);
      return false;//filter out
    });

    //add listerens for new layers
    mbLayerIds.forEach((mbLayerId) => {

      const foundListeners = this._layersWithListeners.find(({ layerId }) => {
        return mbLayerId === layerId;
      });

      if (foundListeners) {
        return;
      }


      const layer = this._getLayer(mbLayerId);
      if (!layer.canShowTooltip()) {
        return;
      }

      const mouseEnterListener = (e) => {
        this._isTooltipOpen = true;
        this._mbMap.getCanvas().style.cursor = 'pointer';
        this._activeFeature = e.features[0];
        this._showTooltip(this._activeFeature, e.lngLat, mbLayerId);
      };
      const mouseLeaveListener = () => {
        this._isTooltipOpen = false;
        this._mbMap.getCanvas().style.cursor = '';
        this._mbPopup.remove();
        ReactDOM.unmountComponentAtNode(this._tooltipContainer);
      };
      const mouseMoveListener = _.debounce((e) => {
        if (!this._isTooltipOpen) {
          return;
        }
        const layer = this._getLayer(mbLayerId);
        const features = this._mbMap.queryRenderedFeatures(e.point)
          .filter(feature => {
            return feature.layer.source === layer.getId();
          });
        if (features.length === 0) {
          return;
        }

        const propertiesUnchanged = _.isEqual(this._activeFeature.properties, features[0].properties);
        const geometryUnchanged = _.isEqual(this._activeFeature.geometry, features[0].geometry);
        if(propertiesUnchanged && geometryUnchanged) {
          // mouse over same feature, no need to update tooltip
          return;
        }

        this._activeFeature = features[0];
        this._showTooltip(this._activeFeature, e.lngLat, mbLayerId);
      }, 100);

      this._mbMap.on('mouseenter', mbLayerId, mouseEnterListener);
      this._mbMap.on('mouseleave', mbLayerId, mouseLeaveListener);
      this._mbMap.on('mousemove', mbLayerId, mouseMoveListener);
      this._layersWithListeners.push({
        layerId: mbLayerId,
        mouseEnterListener,
        mouseLeaveListener,
        mouseMoveListener
      });
    });
  }

  _syncMbMapWithLayerList = () => {

    if (!this.props.isMapReady) {
      return;
    }

    removeOrphanedSourcesAndLayers(this._mbMap, this.props.layerList);
    this.props.layerList.forEach(layer => {
      layer.syncLayerWithMB(this._mbMap);
    });
    syncLayerOrder(this._mbMap, this.props.layerList);

    this._registerAndUnregisterLayerListeners();
  };

  _syncMbMapWithInspector = () => {
    if (!this.props.isMapReady || !this.props.inspectorAdapters.map) {
      return;
    }

    const stats = {
      center: this._mbMap.getCenter().toArray(),
      zoom: this._mbMap.getZoom(),

    };
    this.props.inspectorAdapters.map.setMapState({
      stats,
      style: this._mbMap.getStyle(),
    });
  };

  render() {
    // do not debounce syncing of tooltips and map-state
    this._syncTooltipState();
    this._syncMbMapWithMapState();

    this._debouncedSync();
    return (
      <div id={'mapContainer'} className="mapContainer" ref="mapContainer"/>
    );
  }
}


function clamp(val, min, max) {
  if (val > max) val = max;
  else if (val < min) val = min;
  return val;
}
