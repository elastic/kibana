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

  _updateTooltipState = _.debounce(async (e) => {

    const mbLayerIds = this._getMbLayerIdsForTooltips();
    const features = this._mbMap.queryRenderedFeatures(e.point, { layers: mbLayerIds });

    if (!features.length) {
      this.props.setTooltipState(null);
      return;
    }

    const targetFeature = features[0];
    if (this.props.tooltipState) {
      const propertiesUnchanged = _.isEqual(this.props.tooltipState.activeFeature.properties, targetFeature.properties);
      const geometryUnchanged = _.isEqual(this.props.tooltipState.activeFeature.geometry, targetFeature.geometry);
      if(propertiesUnchanged && geometryUnchanged) {
        return;
      }
    }

    const layer = this._getLayer(targetFeature.layer.id);
    const formattedProperties = await layer.getPropertiesForTooltip(targetFeature.properties);

    let popupAnchorLocation = [e.lngLat.lng, e.lngLat.lat]; // default popup location to mouse location
    if (targetFeature.geometry.type === 'Point') {
      const coordinates = targetFeature.geometry.coordinates.slice();

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      popupAnchorLocation = coordinates;
    }

    this.props.setTooltipState({
      activeFeature: {
        properties: targetFeature.properties,
        geometry: targetFeature.geometry
      },
      formattedProperties: formattedProperties,
      layerId: layer.getId(),
      location: popupAnchorLocation
    });

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

  componentDidUpdate() {
    // do not debounce syncing of map-state and tooltip
    this._syncMbMapWithMapState();
    this._syncTooltipState();
    this._debouncedSync();
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
      this._mbMap = null;
      this._tooltipContainer = null;
    }
    this.props.onMapDestroyed();
  }

  async _initializeMap() {

    this._mbMap = await createMbMapInstance(this.refs.mapContainer, this.props.goto ? this.props.goto.center : null);

    if (!this._isMounted) {
      return;
    }

    this._initResizerChecker();

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


    this._mbMap.on('mousemove', this._updateTooltipState);

    this.props.onMapReady(this._getMapState());
  }

  _initResizerChecker() {
    this._checker = new ResizeChecker(this.refs.mapContainer);
    this._checker.on('resize', () => {
      this._mbMap.resize();
    });
  }

  _hideTooltip() {
    if (this._mbPopup.isOpen()) {
      this._mbPopup.remove();
      ReactDOM.unmountComponentAtNode(this._tooltipContainer);
    }
  }

  _showTooltip()  {
    //todo: can still be optimized. No need to rerender if content remains identical
    ReactDOM.render(
      React.createElement(
        FeatureTooltip, {
          properties: this.props.tooltipState.formattedProperties,
        }
      ),
      this._tooltipContainer
    );

    this._mbPopup.setLngLat(this.props.tooltipState.location)
      .setDOMContent(this._tooltipContainer)
      .addTo(this._mbMap);
  }

  _syncTooltipState() {
    if (this.props.tooltipState) {
      this._showTooltip();
    } else {
      this._hideTooltip();
    }
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
    return (<div id={'mapContainer'} className="mapContainer" ref="mapContainer"/>);
  }
}


function clamp(val, min, max) {
  if (val > max) val = max;
  else if (val < min) val = min;
  return val;
}
