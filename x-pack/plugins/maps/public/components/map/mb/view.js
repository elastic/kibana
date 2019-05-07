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
import {
  DECIMAL_DEGREES_PRECISION,
  FEATURE_ID_PROPERTY_NAME,
  ZOOM_PRECISION
} from '../../../../common/constants';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import DrawRectangle from 'mapbox-gl-draw-rectangle-mode';
import { FeatureTooltip } from '../feature_tooltip';
import { DRAW_TYPE } from '../../../actions/store_actions';
import { filterBarQueryFilter } from '../../../kibana_services';
import { createShapeFilterWithMeta, createExtentFilterWithMeta } from '../../../elasticsearch_geo_utils';

const mbDrawModes = MapboxDraw.modes;
mbDrawModes.draw_rectangle = DrawRectangle;

const TOOLTIP_TYPE = {
  HOVER: 'HOVER',
  LOCKED: 'LOCKED'
};

export class MBMapContainer extends React.Component {


  state = {
    isDrawingFilter: false
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const nextIsDrawingFilter = nextProps.drawState !== null;
    if (nextIsDrawingFilter === prevState.isDrawingFilter) {
      return null;
    }
    return {
      isDrawingFilter: nextIsDrawingFilter
    };
  }

  constructor() {
    super();
    this._mbMap = null;
    this._tooltipContainer = document.createElement('div');
    this._mbPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });
    this._mbDrawControl = new MapboxDraw({
      displayControlsDefault: false,
      modes: mbDrawModes
    });
    this._mbDrawControlAdded = false;
  }

  _onTooltipClose = () => {
    this.props.setTooltipState(null);
  };

  _onDraw = async (e) => {

    if (!e.features.length) {
      return;
    }
    const { geoField, geoFieldType, indexPatternId, drawType } = this.props.drawState;
    this.props.disableDrawState();


    let filter;
    if (drawType === DRAW_TYPE.POLYGON) {
      filter = createShapeFilterWithMeta(e.features[0].geometry, indexPatternId, geoField, geoFieldType);
    } else if (drawType === DRAW_TYPE.BOUNDS) {
      const coordinates = e.features[0].geometry.coordinates[0];
      const extent = {
        minLon: coordinates[0][0],
        minLat: coordinates[0][1],
        maxLon: coordinates[0][0],
        maxLat: coordinates[0][1]
      };
      for (let i  = 1; i < coordinates.length; i++) {
        extent.minLon = Math.min(coordinates[i][0], extent.minLon);
        extent.minLat = Math.min(coordinates[i][1], extent.minLat);
        extent.maxLon = Math.max(coordinates[i][0], extent.maxLon);
        extent.maxLat = Math.max(coordinates[i][1], extent.maxLat);
      }
      filter = createExtentFilterWithMeta(extent, indexPatternId, geoField, geoFieldType);
    }

    if (!filter) {
      return;
    }

    filterBarQueryFilter.addFilters([filter]);
  };

  _debouncedSync = _.debounce(() => {
    if (this._isMounted) {
      this._syncMbMapWithLayerList();
      this._syncMbMapWithInspector();
      this._syncDrawControl();
    }
  }, 256);


  _lockTooltip =  (e) => {

    if (this.state.isDrawingFilter) {
      //ignore click events when in draw mode
      return;
    }

    this._updateHoverTooltipState.cancel();//ignore any possible moves

    const features = this._getFeaturesUnderPointer(e.point);
    if (!features.length) {
      this.props.setTooltipState(null);
      return;
    }

    const targetFeature = features[0];
    const layer = this._getLayerByMbLayerId(targetFeature.layer.id);
    const popupAnchorLocation = this._justifyAnchorLocation(e.lngLat, targetFeature);
    this.props.setTooltipState({
      type: TOOLTIP_TYPE.LOCKED,
      layerId: layer.getId(),
      featureId: targetFeature.properties[FEATURE_ID_PROPERTY_NAME],
      location: popupAnchorLocation
    });
  };

  _updateHoverTooltipState = _.debounce((e) => {

    if (this.state.isDrawingFilter) {
      //ignore hover events when in draw mode
      return;
    }

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

    const layer = this._getLayerByMbLayerId(targetFeature.layer.id);
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

  _removeDrawControl() {
    if (!this._mbDrawControlAdded) {
      return;
    }

    this._mbMap.getCanvas().style.cursor = '';
    this._mbMap.off('draw.create', this._onDraw);
    this._mbMap.removeControl(this._mbDrawControl);
    this._mbDrawControlAdded = false;

  }

  _updateDrawControl() {
    if (!this._mbDrawControlAdded) {
      this._mbMap.addControl(this._mbDrawControl);
      this._mbDrawControlAdded = true;
      this._mbMap.getCanvas().style.cursor = 'crosshair';
      this._mbMap.on('draw.create', this._onDraw);
    }
    const mbDrawMode = this.props.drawState.drawType === DRAW_TYPE.POLYGON ?
      this._mbDrawControl.modes.DRAW_POLYGON : 'draw_rectangle';
    this._mbDrawControl.changeMode(mbDrawMode);
  }

  async _initializeMap() {

    this._mbMap = await createMbMapInstance({
      node: this.refs.mapContainer,
      initialView: this.props.goto ? this.props.goto.center : null,
      scrollZoom: this.props.scrollZoom
    });

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

      this._updateHoverTooltipState.cancel();
      if (this.props.tooltipState && this.props.tooltipState.type !== TOOLTIP_TYPE.LOCKED) {
        this.props.setTooltipState(null);
      }
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
    const targetFeature = tooltipLayer.getFeatureById(this.props.tooltipState.featureId);
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

  _syncDrawControl() {
    if (this.state.isDrawingFilter) {
      this._updateDrawControl();
    } else {
      this._removeDrawControl();
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

  _getLayerById(layerId) {
    return this.props.layerList.find((layer) => {
      return layer.getId() === layerId;
    });
  }

  _getLayerByMbLayerId(mbLayerId) {
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
