/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import { Adapters } from '@kbn/inspector-plugin/public';
import { Filter } from '@kbn/es-query';
import { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';

import { mapboxgl } from '@kbn/mapbox-gl';
import type { Map as MapboxMap, MapboxOptions, MapMouseEvent } from '@kbn/mapbox-gl';
import { ResizeChecker } from '@kbn/kibana-utils-plugin/public';
import { DrawFilterControl } from './draw_control/draw_filter_control';
import { ScaleControl } from './scale_control';
import { TooltipControl } from './tooltip_control';
import { clampToLatBounds, clampToLonBounds } from '../../../common/elasticsearch_util';
import { getInitialView } from './get_initial_view';
import { getPreserveDrawingBuffer } from '../../kibana_services';
import { ILayer } from '../../classes/layers/layer';
import { IVectorSource } from '../../classes/sources/vector_source';
import { MapSettings } from '../../reducers/map';
import {
  CustomIcon,
  Goto,
  MapCenterAndZoom,
  TileMetaFeature,
  Timeslice,
} from '../../../common/descriptor_types';
import {
  CUSTOM_ICON_SIZE,
  DECIMAL_DEGREES_PRECISION,
  MAKI_ICON_SIZE,
  RawValue,
  ZOOM_PRECISION,
} from '../../../common/constants';
import { getGlyphUrl } from '../../util';
import { syncLayerOrder } from './sort_layers';

import { getTileMetaFeatures, removeOrphanedSourcesAndLayers } from './utils';
import { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
import { TileStatusTracker } from './tile_status_tracker';
import { DrawFeatureControl } from './draw_control/draw_feature_control';
import type { MapExtentState } from '../../reducers/map/types';
// @ts-expect-error
import { CUSTOM_ICON_PIXEL_RATIO, createSdfIcon } from '../../classes/styles/vector/symbol_utils';
import { MAKI_ICONS } from '../../classes/styles/vector/maki_icons';

export interface Props {
  isMapReady: boolean;
  settings: MapSettings;
  customIcons: CustomIcon[];
  layerList: ILayer[];
  spatialFiltersLayer: ILayer;
  goto?: Goto | null;
  inspectorAdapters: Adapters;
  isFullScreen: boolean;
  scrollZoom: boolean;
  extentChanged: (mapExtentState: MapExtentState) => void;
  onMapReady: (mapExtentState: MapExtentState) => void;
  onMapDestroyed: () => void;
  setMouseCoordinates: ({ lat, lon }: { lat: number; lon: number }) => void;
  clearMouseCoordinates: () => void;
  clearGoto: () => void;
  setMapInitError: (errorMessage: string) => void;
  addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => void;
  renderTooltipContent?: RenderToolTipContent;
  setAreTilesLoaded: (layerId: string, areTilesLoaded: boolean) => void;
  timeslice?: Timeslice;
  updateMetaFromTiles: (layerId: string, features: TileMetaFeature[]) => void;
  featureModeActive: boolean;
  filterModeActive: boolean;
}

interface State {
  mbMap: MapboxMap | undefined;
}

export class MbMap extends Component<Props, State> {
  private _checker?: ResizeChecker;
  private _isMounted: boolean = false;
  private _containerRef: HTMLDivElement | null = null;
  private _prevCustomIcons?: CustomIcon[];
  private _prevDisableInteractive?: boolean;
  private _prevLayerList?: ILayer[];
  private _prevTimeslice?: Timeslice;
  private _navigationControl = new mapboxgl.NavigationControl({ showCompass: false });
  private _tileStatusTracker?: TileStatusTracker;

  state: State = {
    mbMap: undefined,
  };

  componentDidMount() {
    this._initializeMap();
    this._isMounted = true;
  }

  componentDidUpdate() {
    this._syncMbMapWithMapState(); // do not debounce syncing of map-state
    this._debouncedSync();
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._checker) {
      this._checker.destroy();
    }
    if (this._tileStatusTracker) {
      this._tileStatusTracker.destroy();
    }
    if (this.state.mbMap) {
      this.state.mbMap.remove();
      this.state.mbMap = undefined;
    }
    this.props.onMapDestroyed();
  }

  // This keeps track of the latest update calls, per layerId
  _queryForMeta = (layer: ILayer) => {
    const source = layer.getSource();
    if (
      this.state.mbMap &&
      layer.isVisible() &&
      source.isESSource() &&
      typeof (source as IVectorSource).isMvt === 'function' &&
      (source as IVectorSource).isMvt()
    ) {
      const features = getTileMetaFeatures(this.state.mbMap, layer.getMbSourceId());
      this.props.updateMetaFromTiles(layer.getId(), features);
    }
  };

  _debouncedSync = _.debounce(() => {
    if (this._isMounted && this.props.isMapReady && this.state.mbMap) {
      const hasLayerListChanged = this._prevLayerList !== this.props.layerList; // Comparing re-select memoized instance so no deep equals needed
      const hasTimesliceChanged = !_.isEqual(this._prevTimeslice, this.props.timeslice);
      if (hasLayerListChanged || hasTimesliceChanged) {
        this._prevLayerList = this.props.layerList;
        this._prevTimeslice = this.props.timeslice;
        this._syncMbMapWithLayerList();
        this._syncMbMapWithInspector();
      }
      this.props.spatialFiltersLayer.syncLayerWithMB(this.state.mbMap);
      this._syncSettings();
    }
  }, 256);

  _getMapExtentState(): MapExtentState {
    const zoom = this.state.mbMap!.getZoom();
    const mbCenter = this.state.mbMap!.getCenter();
    const mbBounds = this.state.mbMap!.getBounds();
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

  async _createMbMapInstance(initialView: MapCenterAndZoom | null): Promise<MapboxMap> {
    return new Promise((resolve) => {
      const mbStyle = {
        version: 8,
        sources: {},
        layers: [],
        glyphs: getGlyphUrl(),
      };

      const options: MapboxOptions = {
        attributionControl: false,
        container: this._containerRef!,
        style: mbStyle,
        scrollZoom: this.props.scrollZoom,
        preserveDrawingBuffer: getPreserveDrawingBuffer(),
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

      this._tileStatusTracker = new TileStatusTracker({
        mbMap,
        getCurrentLayerList: () => this.props.layerList,
        updateTileStatus: (layer: ILayer, areTilesLoaded: boolean) => {
          this.props.setAreTilesLoaded(layer.getId(), areTilesLoaded);
          this._queryForMeta(layer);
        },
      });

      let emptyImage: HTMLImageElement;
      mbMap.on('styleimagemissing', (e: unknown) => {
        if (emptyImage) {
          // @ts-expect-error
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
    const initialView = await getInitialView(this.props.goto, this.props.settings);
    if (!this._isMounted) {
      return;
    }

    let mbMap: MapboxMap;
    try {
      mbMap = await this._createMbMapInstance(initialView);
    } catch (error) {
      this.props.setMapInitError(error.message);
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({ mbMap }, () => {
      this._loadMakiSprites(mbMap);
      this._initResizerChecker();
      this._registerMapEventListeners(mbMap);
      this.props.onMapReady(this._getMapExtentState());
    });
  }

  _registerMapEventListeners(mbMap: MapboxMap) {
    // moveend callback is debounced to avoid updating map extent state while map extent is still changing
    // moveend is fired while the map extent is still changing in the following scenarios
    // 1) During opening/closing of layer details panel, the EUI animation results in 8 moveend events
    // 2) Setting map zoom and center from goto is done in 2 API calls, resulting in 2 moveend events
    mbMap.on(
      'moveend',
      _.debounce(() => {
        if (this._isMounted) {
          this.props.extentChanged(this._getMapExtentState());
        }
      }, 100)
    );

    // Attach event only if view control is visible, which shows lat/lon
    if (!this.props.settings.hideViewControl) {
      const throttledSetMouseCoordinates = _.throttle((e: MapMouseEvent) => {
        this.props.setMouseCoordinates({
          lat: e.lngLat.lat,
          lon: e.lngLat.lng,
        });
      }, 100);
      mbMap.on('mousemove', throttledSetMouseCoordinates);
      mbMap.on('mouseout', () => {
        throttledSetMouseCoordinates.cancel(); // cancel any delayed setMouseCoordinates invocations
        this.props.clearMouseCoordinates();
      });
    }
  }

  _initResizerChecker() {
    this._checker = new ResizeChecker(this._containerRef!);
    this._checker.on('resize', () => {
      if (this.state.mbMap) {
        this.state.mbMap.resize();
      }
    });
  }

  async _loadMakiSprites(mbMap: MapboxMap) {
    if (this._isMounted) {
      const pixelRatio = Math.floor(window.devicePixelRatio);
      for (const [symbolId, { svg }] of Object.entries(MAKI_ICONS)) {
        if (!mbMap.hasImage(symbolId)) {
          const imageData = await createSdfIcon({ renderSize: MAKI_ICON_SIZE, svg });
          mbMap.addImage(symbolId, imageData, {
            pixelRatio,
            sdf: true,
          });
        }
      }
    }
  }

  _syncMbMapWithMapState = () => {
    const { isMapReady, goto, clearGoto } = this.props;

    if (!isMapReady || !goto || !this.state.mbMap) {
      return;
    }

    clearGoto();

    if (goto.bounds) {
      // clamping ot -89/89 latitudes since Mapboxgl does not seem to handle bounds that contain the poles (logs errors to the console when using -90/90)
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
      // maxZoom ensure we're not zooming in too far on single points or small shapes
      // the padding is to avoid too tight of a fit around edges
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
    if (!this.state.mbMap) {
      return;
    }

    removeOrphanedSourcesAndLayers(
      this.state.mbMap,
      this.props.layerList,
      this.props.spatialFiltersLayer
    );
    this.props.layerList.forEach((layer) =>
      layer.syncLayerWithMB(this.state.mbMap!, this.props.timeslice)
    );
    syncLayerOrder(this.state.mbMap, this.props.spatialFiltersLayer, this.props.layerList);
  };

  _syncMbMapWithInspector = () => {
    if (!this.props.inspectorAdapters.map || !this.state.mbMap) {
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
    if (!this.state.mbMap) {
      return;
    }

    if (
      this._prevDisableInteractive === undefined ||
      this._prevDisableInteractive !== this.props.settings.disableInteractive
    ) {
      this._prevDisableInteractive = this.props.settings.disableInteractive;
      if (this.props.settings.disableInteractive) {
        this.state.mbMap.boxZoom.disable();
        this.state.mbMap.doubleClickZoom.disable();
        this.state.mbMap.dragPan.disable();
        try {
          this.state.mbMap.removeControl(this._navigationControl);
        } catch (error) {
          // ignore removeControl errors
        }
      } else {
        this.state.mbMap.boxZoom.enable();
        this.state.mbMap.doubleClickZoom.enable();
        this.state.mbMap.dragPan.enable();
        this.state.mbMap.addControl(this._navigationControl, 'top-left');
      }
    }

    if (
      this._prevCustomIcons === undefined ||
      !_.isEqual(this._prevCustomIcons, this.props.customIcons)
    ) {
      this._prevCustomIcons = this.props.customIcons;
      const mbMap = this.state.mbMap;
      for (const { symbolId, svg, cutoff, radius } of this.props.customIcons) {
        createSdfIcon({ svg, renderSize: CUSTOM_ICON_SIZE, cutoff, radius }).then(
          (imageData: ImageData) => {
            // @ts-expect-error MapboxMap type is missing updateImage method
            if (mbMap.hasImage(symbolId)) mbMap.updateImage(symbolId, imageData);
            else
              mbMap.addImage(symbolId, imageData, {
                sdf: true,
                pixelRatio: CUSTOM_ICON_PIXEL_RATIO,
              });
          }
        );
      }
    }

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
        if (this._isMounted) {
          this.props.extentChanged(this._getMapExtentState());
        }
      }, 300);
    }
  }

  _setContainerRef = (element: HTMLDivElement) => {
    this._containerRef = element;
  };

  render() {
    let drawFilterControl;
    let drawFeatureControl;
    let tooltipControl;
    let scaleControl;
    if (this.state.mbMap) {
      drawFilterControl =
        this.props.addFilters && this.props.filterModeActive ? (
          <DrawFilterControl mbMap={this.state.mbMap} addFilters={this.props.addFilters} />
        ) : null;
      drawFeatureControl = this.props.featureModeActive ? (
        <DrawFeatureControl mbMap={this.state.mbMap} />
      ) : null;
      tooltipControl = !this.props.settings.disableTooltipControl ? (
        <TooltipControl
          mbMap={this.state.mbMap}
          addFilters={this.props.addFilters}
          getFilterActions={this.props.getFilterActions}
          getActionContext={this.props.getActionContext}
          onSingleValueTrigger={this.props.onSingleValueTrigger}
          renderTooltipContent={this.props.renderTooltipContent}
        />
      ) : null;
      scaleControl = this.props.settings.showScaleControl ? (
        <ScaleControl mbMap={this.state.mbMap} isFullScreen={this.props.isFullScreen} />
      ) : null;
    }
    return (
      <div
        id="mapContainer"
        className="mapContainer"
        ref={this._setContainerRef}
        data-test-subj="mapContainer"
      >
        {drawFilterControl}
        {drawFeatureControl}
        {scaleControl}
        {tooltipControl}
      </div>
    );
  }
}
