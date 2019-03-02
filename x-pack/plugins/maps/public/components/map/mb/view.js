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
    this._activeTooltipFeature = null;
    this._mbPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });
  }

  _debouncedSync = _.debounce(() => {
    if (this._isMounted) {
      this._syncMbMapWithLayerList();
      this._syncMbMapWithInspector();
    }
  }, 256);

   _onMouseMove = _.debounce((e) => {

     const mbLayerIds = this._getMbLayerIdsForTooltips();
     const features = this._mbMap.queryRenderedFeatures(e.point, {
       layers: mbLayerIds
     });

     if (!features.length) {
       if (this._activeTooltipFeature) {
         this._mbPopup.remove();
         ReactDOM.unmountComponentAtNode(this._tooltipContainer);
         this._activeTooltipFeature = null;
       }
       return;
     }

     const targetFeature = features[0];
     if (this._activeTooltipFeature) {
       const propertiesUnchanged = _.isEqual(this._activeTooltipFeature.properties, targetFeature.properties);
       const geometryUnchanged = _.isEqual(this._activeTooltipFeature.geometry, targetFeature.geometry);
       if(propertiesUnchanged && geometryUnchanged) {
         return;
       }
     }

     this._activeTooltipFeature = targetFeature;
     this._showTooltip(this._activeTooltipFeature, e.lngLat, targetFeature.layer.id);

   }, 100);


   _getMbLayerIdsForTooltips() {
     return this.props.layerList.reduce((mbLayerIds, layer) => {
       return layer.canShowTooltip() ? mbLayerIds.concat(layer.getMbLayerIds()) : mbLayerIds;
     }, []);
   }

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
       this._mbMap.remove();
       this._mbMap.off('mousemove', this._onMouseMove);
       this._mbMap = null;
       this._tooltipContainer = null;
       this._activeTooltipFeature = null;
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


     this._mbMap.on('mousemove', this._onMouseMove);

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
     const properties = await layer.getPropertiesForTooltip(feature.properties);

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

  _getLayer(mbLayerId) {
    return this.props.layerList.find((layer) => {
      const mbLayerIds = layer.getMbLayerIds();
      return mbLayerIds.indexOf(mbLayerId) > -1;
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
