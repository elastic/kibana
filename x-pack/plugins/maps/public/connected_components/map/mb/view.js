/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { ResizeChecker } from '../../../../../../../src/plugins/kibana_utils/public';
import { removeOrphanedSourcesAndLayers, addSpritesheetToMap } from './utils';
import { syncLayerOrder } from './sort_layers';
import { getGlyphUrl, isRetina } from '../../../meta';
import {
  DECIMAL_DEGREES_PRECISION,
  KBN_TOO_MANY_FEATURES_IMAGE_ID,
  ZOOM_PRECISION,
} from '../../../../common/constants';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl-csp';
import mbWorkerUrl from '!!file-loader!mapbox-gl/dist/mapbox-gl-csp-worker';
import mbRtlPlugin from '!!file-loader!@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js';
import { spritesheet } from '@elastic/maki';
import sprites1 from '@elastic/maki/dist/sprite@1.png';
import sprites2 from '@elastic/maki/dist/sprite@2.png';
import { DrawControl } from './draw_control';
import { TooltipControl } from './tooltip_control';
import { clampToLatBounds, clampToLonBounds } from '../../../../common/elasticsearch_geo_utils';
import { getInitialView } from './get_initial_view';
import { getPreserveDrawingBuffer } from '../../../kibana_services';

mapboxgl.workerUrl = mbWorkerUrl;
mapboxgl.setRTLTextPlugin(mbRtlPlugin);

export class MBMap extends React.Component {
  state = {
    prevLayerList: undefined,
    hasSyncedLayerList: false,
    mbMap: undefined,
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const nextLayerList = nextProps.layerList;
    if (nextLayerList !== prevState.prevLayerList) {
      return {
        prevLayerList: nextLayerList,
        hasSyncedLayerList: false,
      };
    }

    return null;
  }

  componentDidMount() {
    this._initializeMap();
    this._isMounted = true;
  }

  componentDidUpdate() {
    if (this.state.mbMap) {
      // do not debounce syncing of map-state
      this._syncMbMapWithMapState();
      this._debouncedSync();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._checker) {
      this._checker.destroy();
    }
    if (this.state.mbMap) {
      this.state.mbMap.remove();
      this.state.mbMap = null;
    }
    this.props.onMapDestroyed();
  }

  _debouncedSync = _.debounce(() => {
    if (this._isMounted && this.props.isMapReady) {
      if (!this.state.hasSyncedLayerList) {
        this.setState(
          {
            hasSyncedLayerList: true,
          },
          () => {
            this._syncMbMapWithLayerList();
            this._syncMbMapWithInspector();
          }
        );
      }
      this.props.spatialFiltersLayer.syncLayerWithMB(this.state.mbMap);
      this._syncSettings();
    }
  }, 256);

  _getMapState() {
    const zoom = this.state.mbMap.getZoom();
    const mbCenter = this.state.mbMap.getCenter();
    const mbBounds = this.state.mbMap.getBounds();
    return {
      zoom: _.round(zoom, ZOOM_PRECISION),
      center: {
        lon: _.round(mbCenter.lng, DECIMAL_DEGREES_PRECISION),
        lat: _.round(mbCenter.lat, DECIMAL_DEGREES_PRECISION),
      },
      extent: {
        minLon: _.round(mbBounds.getWest(), DECIMAL_DEGREES_PRECISION),
        minLat: _.round(mbBounds.getSouth(), DECIMAL_DEGREES_PRECISION),
        maxLon: _.round(mbBounds.getEast(), DECIMAL_DEGREES_PRECISION),
        maxLat: _.round(mbBounds.getNorth(), DECIMAL_DEGREES_PRECISION),
      },
    };
  }

  async _createMbMapInstance() {
    const initialView = await getInitialView(this.props.goto, this.props.settings);
    return new Promise((resolve) => {
      const mbStyle = {
        version: 8,
        sources: {},
        layers: [],
        glyphs: getGlyphUrl(),
      };

      const options = {
        attributionControl: false,
        container: this.refs.mapContainer,
        style: mbStyle,
        scrollZoom: this.props.scrollZoom,
        preserveDrawingBuffer: getPreserveDrawingBuffer(),
        interactive: !this.props.disableInteractive,
        maxZoom: this.props.settings.maxZoom,
        minZoom: this.props.settings.minZoom,
      };
      if (initialView) {
        options.zoom = initialView.zoom;
        options.center = {
          lng: initialView.lon,
          lat: initialView.lat,
        };
      } else {
        options.bounds = [-170, -60, 170, 75];
      }
      const mbMap = new mapboxgl.Map(options);
      mbMap.dragRotate.disable();
      mbMap.touchZoomRotate.disableRotation();
      if (!this.props.disableInteractive) {
        mbMap.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');
      }

      const hatchImageBase64 =
        'data:image/png;base64,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';

      const hatchImage = new Image();
      hatchImage.onload = () => {
        mbMap.addImage(KBN_TOO_MANY_FEATURES_IMAGE_ID, hatchImage);
      };
      hatchImage.src = hatchImageBase64;

      let emptyImage;
      mbMap.on('styleimagemissing', (e) => {
        if (emptyImage) {
          mbMap.addImage(e.id, emptyImage);
        }
      });
      mbMap.on('load', () => {
        emptyImage = new Image();

        emptyImage.src =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII=';
        emptyImage.crossOrigin = 'anonymous';
        resolve(mbMap);
      });
    });
  }

  async _initializeMap() {
    let mbMap;
    try {
      mbMap = await this._createMbMapInstance();
    } catch (error) {
      this.props.setMapInitError(error.message);
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({ mbMap }, () => {
      this._loadMakiSprites();
      this._initResizerChecker();
      this._registerMapEventListeners();
      this.props.onMapReady(this._getMapState());
    });
  }

  _registerMapEventListeners() {
    // moveend callback is debounced to avoid updating map extent state while map extent is still changing
    // moveend is fired while the map extent is still changing in the following scenarios
    // 1) During opening/closing of layer details panel, the EUI animation results in 8 moveend events
    // 2) Setting map zoom and center from goto is done in 2 API calls, resulting in 2 moveend events
    this.state.mbMap.on(
      'moveend',
      _.debounce(() => {
        this.props.extentChanged(this._getMapState());
      }, 100)
    );
    // Attach event only if view control is visible, which shows lat/lon
    if (!this.props.hideViewControl) {
      const throttledSetMouseCoordinates = _.throttle((e) => {
        this.props.setMouseCoordinates({
          lat: e.lngLat.lat,
          lon: e.lngLat.lng,
        });
      }, 100);
      this.state.mbMap.on('mousemove', throttledSetMouseCoordinates);
      this.state.mbMap.on('mouseout', () => {
        throttledSetMouseCoordinates.cancel(); // cancel any delayed setMouseCoordinates invocations
        this.props.clearMouseCoordinates();
      });
    }
  }

  _initResizerChecker() {
    this._checker = new ResizeChecker(this.refs.mapContainer);
    this._checker.on('resize', () => {
      this.state.mbMap.resize();
    });
  }

  _loadMakiSprites() {
    const sprites = isRetina() ? sprites2 : sprites1;
    const json = isRetina() ? spritesheet[2] : spritesheet[1];
    addSpritesheetToMap(json, sprites, this.state.mbMap);
  }

  _syncMbMapWithMapState = () => {
    const { isMapReady, goto, clearGoto } = this.props;

    if (!isMapReady || !goto) {
      return;
    }

    clearGoto();

    if (goto.bounds) {
      //clamping ot -89/89 latitudes since Mapboxgl does not seem to handle bounds that contain the poles (logs errors to the console when using -90/90)
      const lnLatBounds = new mapboxgl.LngLatBounds(
        new mapboxgl.LngLat(
          clampToLonBounds(goto.bounds.minLon),
          clampToLatBounds(goto.bounds.minLat)
        ),
        new mapboxgl.LngLat(
          clampToLonBounds(goto.bounds.maxLon),
          clampToLatBounds(goto.bounds.maxLat)
        )
      );
      //maxZoom ensure we're not zooming in too far on single points or small shapes
      //the padding is to avoid too tight of a fit around edges
      this.state.mbMap.fitBounds(lnLatBounds, { maxZoom: 17, padding: 16 });
    } else if (goto.center) {
      this.state.mbMap.setZoom(goto.center.zoom);
      this.state.mbMap.setCenter({
        lng: goto.center.lon,
        lat: goto.center.lat,
      });
    }
  };

  _syncMbMapWithLayerList = () => {
    removeOrphanedSourcesAndLayers(
      this.state.mbMap,
      this.props.layerList,
      this.props.spatialFiltersLayer
    );
    this.props.layerList.forEach((layer) => layer.syncLayerWithMB(this.state.mbMap));
    syncLayerOrder(this.state.mbMap, this.props.spatialFiltersLayer, this.props.layerList);
  };

  _syncMbMapWithInspector = () => {
    if (!this.props.inspectorAdapters.map) {
      return;
    }

    const stats = {
      center: this.state.mbMap.getCenter().toArray(),
      zoom: this.state.mbMap.getZoom(),
    };
    this.props.inspectorAdapters.map.setMapState({
      stats,
      style: this.state.mbMap.getStyle(),
    });
  };

  _syncSettings() {
    let zoomRangeChanged = false;
    if (this.props.settings.minZoom !== this.state.mbMap.getMinZoom()) {
      this.state.mbMap.setMinZoom(this.props.settings.minZoom);
      zoomRangeChanged = true;
    }
    if (this.props.settings.maxZoom !== this.state.mbMap.getMaxZoom()) {
      this.state.mbMap.setMaxZoom(this.props.settings.maxZoom);
      zoomRangeChanged = true;
    }

    // 'moveend' event not fired when map moves from setMinZoom or setMaxZoom
    // https://github.com/mapbox/mapbox-gl-js/issues/9610
    // hack to update extent after zoom update finishes moving map.
    if (zoomRangeChanged) {
      setTimeout(() => {
        this.props.extentChanged(this._getMapState());
      }, 300);
    }
  }

  render() {
    let drawControl;
    let tooltipControl;
    if (this.state.mbMap) {
      drawControl = <DrawControl mbMap={this.state.mbMap} addFilters={this.props.addFilters} />;
      tooltipControl = !this.props.disableTooltipControl ? (
        <TooltipControl
          mbMap={this.state.mbMap}
          addFilters={this.props.addFilters}
          geoFields={this.props.geoFields}
          renderTooltipContent={this.props.renderTooltipContent}
        />
      ) : null;
    }
    return (
      <div
        id="mapContainer"
        className="mapContainer"
        ref="mapContainer"
        data-test-subj="mapContainer"
      >
        {drawControl}
        {tooltipControl}
      </div>
    );
  }
}
