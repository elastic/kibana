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
import { DECIMAL_DEGREES_PRECISION, FEATURE_ID_PROPERTY_NAME, ZOOM_PRECISION } from '../../../../common/constants';
import mapboxgl from 'mapbox-gl';
import { FeatureTooltip } from '../feature_tooltip';


const TOOLTIP_TYPE = {
  HOVER: 'HOVER',
  LOCKED: 'LOCKED'
};

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

  _onTooltipClose = () => {
    this.props.setTooltipState(null);
  };

  _debouncedSync = _.debounce(() => {
    if (this._isMounted) {
      this._syncMbMapWithLayerList();
      this._syncMbMapWithInspector();
    }
  }, 256);


  _lockTooltip =  (e) => {

    this._updateHoverTooltipState.cancel();//ignore any possible moves

    const features = this._getFeaturesUnderPointer(e.point);
    if (!features.length) {
      this.props.setTooltipState(null);
      return;
    }

    const targetFeature = features[0];
    const layer = this._getLayer(targetFeature.layer.id);
    const popupAnchorLocation = this._justifyAnchorLocation(e.lngLat, targetFeature);
    this.props.setTooltipState({
      type: TOOLTIP_TYPE.LOCKED,
      layerId: layer.getId(),
      featureId: targetFeature.properties[FEATURE_ID_PROPERTY_NAME],
      location: popupAnchorLocation
    });
  };

  _updateHoverTooltipState = _.debounce((e) => {

    if (this.props.tooltipState && this.props.tooltipState.type === TOOLTIP_TYPE.LOCKED) {
      //ignore hover events when tooltip is locked
      return;
    }

    const features = this._getFeaturesUnderPointer(e.point);
    if (!features.length) {
      this.props.setTooltipState(null);
      return;
    }

    const targetFeature = features[0];

    if (this.props.tooltipState) {
      if (targetFeature.properties[FEATURE_ID_PROPERTY_NAME] === this.props.tooltipState.featureId) {
        return;
      }
    }

    const layer = this._getLayer(targetFeature.layer.id);
    const popupAnchorLocation = this._justifyAnchorLocation(e.lngLat, targetFeature);

    this.props.setTooltipState({
      type: TOOLTIP_TYPE.HOVER,
      featureId: targetFeature.properties[FEATURE_ID_PROPERTY_NAME],
      layerId: layer.getId(),
      location: popupAnchorLocation
    });

  }, 100);

  _justifyAnchorLocation(mbLngLat, targetFeature) {
    let popupAnchorLocation = [mbLngLat.lng, mbLngLat.lat]; // default popup location to mouse location
    if (targetFeature.geometry.type === 'Point') {
      const coordinates = targetFeature.geometry.coordinates.slice();

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(mbLngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += mbLngLat.lng > coordinates[0] ? 360 : -360;
      }

      popupAnchorLocation = coordinates;
    }
    return popupAnchorLocation;
  }
  _getMbLayerIdsForTooltips() {

    const mbLayerIds = this.props.layerList.reduce((mbLayerIds, layer) => {
      return layer.canShowTooltip() ? mbLayerIds.concat(layer.getMbLayerIds()) : mbLayerIds;
    }, []);


    //ensure all layers that are actually on the map
    //the raw list may contain layer-ids that have not been added to the map yet.
    //For example:
    //a vector or heatmap layer will not add a source and layer to the mapbox-map, until that data is available.
    //during that data-fetch window, the app should not query for layers that do not exist.
    return mbLayerIds.filter((mbLayerId) => {
      return !!this._mbMap.getLayer(mbLayerId);
    });
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

  _getFeaturesUnderPointer(mbLngLatPoint) {

    if (!this._mbMap) {
      return [];
    }

    const mbLayerIds = this._getMbLayerIdsForTooltips();
    const PADDING = 2;//in pixels
    const mbBbox = [
      {
        x: mbLngLatPoint.x - PADDING,
        y: mbLngLatPoint.y - PADDING
      },
      {
        x: mbLngLatPoint.x + PADDING,
        y: mbLngLatPoint.y + PADDING
      }
    ];
    return this._mbMap.queryRenderedFeatures(mbBbox, { layers: mbLayerIds });
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


    this._mbMap.on('mousemove', this._updateHoverTooltipState);
    this._mbMap.on('click', this._lockTooltip);

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

  _renderContentToTooltip(content, location) {
    if (!this._isMounted) {
      return;
    }
    const isLocked = this.props.tooltipState.type === TOOLTIP_TYPE.LOCKED;
    ReactDOM.render((
      <FeatureTooltip
        properties={content}
        closeTooltip={this._onTooltipClose}
        showFilterButtons={this.props.isFilterable && isLocked}
        showCloseButton={isLocked}
      />
    ), this._tooltipContainer);

    this._mbPopup.setLngLat(location)
      .setDOMContent(this._tooltipContainer)
      .addTo(this._mbMap);
  }


  async _showTooltip()  {
    const tooltipLayer = this.props.layerList.find(layer => {
      return layer.getId() === this.props.tooltipState.layerId;
    });
    const targetFeature = tooltipLayer.getFeatureByFeatureById(this.props.tooltipState.featureId);
    const formattedProperties = await tooltipLayer.getPropertiesForTooltip(targetFeature.properties);
    this._renderContentToTooltip(formattedProperties, this.props.tooltipState.location);
  }

  _syncTooltipState() {
    if (this.props.tooltipState) {
      this._mbMap.getCanvas().style.cursor = 'pointer';
      this._showTooltip();
    } else {
      this._mbMap.getCanvas().style.cursor = '';
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
