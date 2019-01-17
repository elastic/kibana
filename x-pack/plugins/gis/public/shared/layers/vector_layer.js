/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mapboxgl from 'mapbox-gl';
import React from 'react';
import ReactDOM from 'react-dom';

import { ALayer } from './layer';
import { VectorStyle } from './styles/vector_style';
import { LeftInnerJoin } from './joins/left_inner_join';

import { FeatureTooltip } from 'plugins/gis/components/map/feature_tooltip';
import { store } from '../../store/store';
import { getMapColors } from '../../selectors/map_selectors';
import _ from 'lodash';

const DEFAULT_COLORS = ['#e6194b', '#3cb44b', '#ffe119', '#f58231', '#911eb4'];

const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: []
};

export class VectorLayer extends ALayer {

  static type = 'VECTOR';

  static popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'euiPanel euiPanel--shadow',
  });

  static tooltipContainer = document.createElement('div');

  static createDescriptor(options) {
    // Colors must be state-aware to reduce unnecessary incrementation
    const DEFAULT_ALPHA_VALUE = 1;
    const mapColors = getMapColors(store.getState());
    const lastColor = mapColors.pop();
    const nextColor = DEFAULT_COLORS[
      (DEFAULT_COLORS.indexOf(lastColor) + 1) % (DEFAULT_COLORS.length - 1)
    ];
    const layerDescriptor = super.createDescriptor(options);
    layerDescriptor.type = VectorLayer.type;
    if (!options.style) {
      layerDescriptor.style = VectorStyle.createDescriptor({
        fillColor: {
          type: VectorStyle.STYLE_TYPE.STATIC,
          options: {
            color: nextColor,
          }
        },
        lineColor: {
          type: VectorStyle.STYLE_TYPE.STATIC,
          options: {
            color: '#FFFFFF'
          }
        },
        lineWidth: {
          type: VectorStyle.STYLE_TYPE.STATIC,
          options: {
            size: 1
          }
        },
        iconSize: {
          type: VectorStyle.STYLE_TYPE.STATIC,
          options: {
            size: 10
          }
        },
        alphaValue: DEFAULT_ALPHA_VALUE
      });
    }
    return layerDescriptor;
  }

  constructor(options) {
    super(options);
    this._joins =  [];
    if (options.layerDescriptor.joins) {
      options.layerDescriptor.joins.forEach((joinDescriptor) => {
        this._joins.push(new LeftInnerJoin(joinDescriptor));
      });
    }
  }

  destroy() {
    if (this._source) {
      this._source.destroy();
    }
    this._joins.forEach(joinSource => {
      joinSource.destroy();
    });
  }

  isJoinable() {
    return !this._source.isFilterByMapBounds();
  }

  getJoins() {
    return this._joins.slice();
  }

  getValidJoins() {
    return this._joins.filter(join => {
      return join.hasCompleteConfig();
    });
  }

  getSupportedStyles() {
    return [VectorStyle];
  }

  getIcon() {
    const isPointsOnly = this._isPointsOnly();
    return this._style.getIcon(isPointsOnly);
  }

  getColorRamp() {
    // TODO: Determine if can be data-driven first
    return this._style.getColorRamp();
  }

  getTOCDetails() {
    return this._style.getTOCDetails();
  }

  async getStringFields() {
    return await this._source.getStringFields();
  }

  async getSourceName() {
    return this._source.getDisplayName();
  }

  async getOrdinalFields() {
    const numberFields = await this._source.getNumberFields();
    const numberFieldOptions = numberFields.map(({ label, name }) => {
      return {
        label,
        name,
        origin: 'source'
      };
    });
    const joinFields = [];
    this.getValidJoins().forEach(join => {
      const fields = join.getJoinFields().map(joinField => {
        return {
          ...joinField,
          origin: 'join',
        };
      });
      joinFields.push(...fields);
    });

    return [...numberFieldOptions, ...joinFields];
  }

  getIndexPatternIds() {
    const indexPatternIds = this._source.getIndexPatternIds();
    this.getValidJoins().forEach(join => {
      indexPatternIds.push(...join.getIndexPatternIds());
    });
    return indexPatternIds;
  }

  _findDataRequestForSource(sourceDataId) {
    return this._dataRequests.find(dataRequest => dataRequest.getDataId() === sourceDataId);
  }

  async _canSkipSourceUpdate(source, sourceDataId, filters) {
    const timeAware = await source.isTimeAware();
    const refreshTimerAware = await source.isRefreshTimerAware();
    const extentAware = source.isFilterByMapBounds();
    const isFieldAware = source.isFieldAware();
    const isQueryAware = source.isQueryAware();

    if (!timeAware && !refreshTimerAware && !extentAware && !isFieldAware && !isQueryAware) {
      const sourceDataRequest = this._findDataRequestForSource(sourceDataId);
      if (sourceDataRequest && sourceDataRequest.hasDataOrRequestInProgress()) {
        return true;
      }

      return false;
    }

    const sourceDataRequest = this._findDataRequestForSource(sourceDataId);
    if (!sourceDataRequest) {
      return false;
    }
    const meta = sourceDataRequest.getMeta();
    if (!meta) {
      return false;
    }

    let updateDueToTime = false;
    if (timeAware) {
      updateDueToTime = !_.isEqual(meta.timeFilters, filters.timeFilters);
    }

    let updateDueToRefreshTimer = false;
    if (refreshTimerAware && filters.refreshTimerLastTriggeredAt) {
      updateDueToRefreshTimer = !_.isEqual(meta.refreshTimerLastTriggeredAt, filters.refreshTimerLastTriggeredAt);
    }

    let updateDueToFields = false;
    if (isFieldAware) {
      updateDueToFields = !_.isEqual(meta.fieldNames, filters.fieldNames);
    }

    let updateDueToQuery = false;
    if (isQueryAware) {
      updateDueToQuery = !_.isEqual(meta.query, filters.query);
    }

    return !updateDueToTime
      && !updateDueToRefreshTimer
      && !this.updateDueToExtent(source, meta, filters)
      && !updateDueToFields
      && !updateDueToQuery;
  }

  async _syncJoin(join, { startLoading, stopLoading, onLoadError, dataFilters }) {

    const joinSource = join.getJoinSource();
    const sourceDataId = join.getSourceId();
    const requestToken = Symbol(`layer-join-refresh:${ this.getId()} - ${sourceDataId}`);

    try {
      const canSkip = await this._canSkipSourceUpdate(joinSource, sourceDataId, dataFilters);
      if (canSkip) {
        return {
          shouldJoin: false,
          join: join
        };
      }
      startLoading(sourceDataId, requestToken, dataFilters);
      const leftSourceName = await this.getSourceName();
      const {
        rawData,
        propertiesMap
      } = await joinSource.getPropertiesMap(dataFilters, leftSourceName, join.getLeftFieldName());
      stopLoading(sourceDataId, requestToken, rawData);
      return {
        shouldJoin: true,
        join: join,
        propertiesMap: propertiesMap,
      };
    } catch(e) {
      console.error(e);
      onLoadError(sourceDataId, requestToken, e.medium);
      return {
        shouldJoin: false,
        join: join
      };
    }
  }


  async _syncJoins({ startLoading, stopLoading, onLoadError, dataFilters }) {
    const joinSyncs = this.getValidJoins().map(async join => {
      return this._syncJoin(join, { startLoading, stopLoading, onLoadError, dataFilters });
    });
    return await Promise.all(joinSyncs);
  }


  async _syncSource({ startLoading, stopLoading, onLoadError, dataFilters }) {
    const sourceDataId = 'source';
    const requestToken = Symbol(`layer-source-refresh:${ this.getId()} - source`);
    try {
      const fieldNames = [
        ...this._source.getFieldNames(),
        ...this._style.getSourceFieldNames(),
        ...this.getValidJoins().map(join => {
          return join.getLeftFieldName();
        })
      ];
      const filters = {
        ...dataFilters,
        fieldNames: _.uniq(fieldNames).sort()
      };
      const canSkip = await this._canSkipSourceUpdate(this._source, sourceDataId, filters);
      if (canSkip) {
        const sourceDataRequest = this.getSourceDataRequest();
        return {
          refreshed: false,
          featureCollection: sourceDataRequest.getData()
        };
      }
      startLoading(sourceDataId, requestToken, filters);
      const layerName = await this.getDisplayName();
      const { data, meta } = await this._source.getGeoJsonWithMeta({
        layerName,
      }, filters);
      stopLoading(sourceDataId, requestToken, data, meta);
      return {
        refreshed: true,
        featureCollection: data
      };
    } catch (error) {
      onLoadError(sourceDataId, requestToken, error.message);
      return  {
        refreshed: false
      };
    }
  }

  _joinToFeatureCollection(sourceResult, joinState) {
    if (!sourceResult.refreshed && !joinState.shouldJoin) {
      return false;
    }
    if (!sourceResult.featureCollection) {
      return false;
    }
    joinState.join.joinPropertiesToFeatureCollection(
      sourceResult.featureCollection,
      joinState.propertiesMap);
    return true;
  }

  async _performJoins(sourceResult, joinStates) {

    const hasJoined = joinStates.map(joinState => {
      return this._joinToFeatureCollection(sourceResult, joinState);
    });

    return hasJoined.some(shouldRefresh => shouldRefresh === true);
  }

  async syncData({ startLoading, stopLoading, onLoadError, onRefreshStyle, dataFilters }) {
    if (!this.isVisible() || !this.showAtZoomLevel(dataFilters.zoom)) {
      return;
    }
    const sourceResult = await this._syncSource({ startLoading, stopLoading, onLoadError, dataFilters });
    const joinResults = await this._syncJoins({ startLoading, stopLoading, onLoadError, dataFilters });
    const shouldRefresh = await this._performJoins(sourceResult, joinResults);
    if (shouldRefresh) {
      onRefreshStyle();
    }
  }

  _getSourceFeatureCollection() {
    const sourceDataRequest = this.getSourceDataRequest();
    return sourceDataRequest ? sourceDataRequest.getData() : null;
  }

  _isPointsOnly() {
    const featureCollection = this._getSourceFeatureCollection();
    if (!featureCollection) {
      return false;
    }
    let isPointsOnly = true;
    if (featureCollection) {
      for (let i = 0; i < featureCollection.features.length; i++) {
        if (featureCollection.features[i].geometry.type !== 'Point') {
          isPointsOnly = false;
          break;
        }
      }
    } else {
      isPointsOnly = false;
    }
    return isPointsOnly;
  }

  _syncFeatureCollectionWithMb(mbMap) {
    const mbGeoJSONSource = mbMap.getSource(this.getId());

    const featureCollection = this._getSourceFeatureCollection();
    if (!featureCollection) {
      mbGeoJSONSource.setData(EMPTY_FEATURE_COLLECTION);
      return;
    }

    const dataBoundToMap = ALayer.getBoundDataForSource(mbMap, this.getId());
    if (featureCollection !== dataBoundToMap) {
      mbGeoJSONSource.setData(featureCollection);
    }

    const shouldRefresh = this._style.addScaledPropertiesBasedOnStyle(featureCollection);
    if (shouldRefresh) {
      mbGeoJSONSource.setData(featureCollection);
    }
  }

  _setMbPointsProperties(mbMap) {
    const sourceId = this.getId();
    const pointLayerId = this.getId() +  '_circle';
    const pointLayer = mbMap.getLayer(pointLayerId);
    if (!pointLayer) {
      mbMap.addLayer({
        id: pointLayerId,
        type: 'circle',
        source: sourceId,
        paint: {}
      });
      mbMap.setFilter(pointLayerId, ['any', ['==', ['geometry-type'], 'Point'], ['==', ['geometry-type'], 'MultiPoint']]);
    }
    this._style.setMBPaintPropertiesForPoints(mbMap, this.getId(), pointLayerId);
    mbMap.setLayoutProperty(pointLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayerZoomRange(pointLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    this._addTooltipListeners(mbMap, pointLayerId);
  }

  _setMbLinePolygonProeprties(mbMap) {
    const sourceId = this.getId();
    const fillLayerId = this.getId() + '_fill';
    const lineLayerId = this.getId() + '_line';
    if (!mbMap.getLayer(fillLayerId)) {
      mbMap.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {}
      });
      mbMap.setFilter(fillLayerId, [
        'any',
        ['==', ['geometry-type'], 'Polygon'],
        ['==', ['geometry-type'], 'MultiPolygon'],
        ['==', ['geometry-type'], 'LineString'],
        ['==', ['geometry-type'], 'MultiLineString']
      ]);
    }
    if (!mbMap.getLayer(lineLayerId)) {
      mbMap.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {}
      });
      mbMap.setFilter(lineLayerId, [
        'any',
        ['==', ['geometry-type'], 'Polygon'],
        ['==', ['geometry-type'], 'MultiPolygon'],
        ['==', ['geometry-type'], 'LineString'],
        ['==', ['geometry-type'], 'MultiLineString']
      ]);
    }
    this._style.setMBPaintProperties(mbMap, this.getId(), fillLayerId, lineLayerId, this.isTemporary());
    mbMap.setLayoutProperty(fillLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayoutProperty(lineLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayerZoomRange(lineLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    mbMap.setLayerZoomRange(fillLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    this._addTooltipListeners(mbMap, fillLayerId);
  }

  _syncStylePropertiesWithMb(mbMap) {
    this._setMbPointsProperties(mbMap);
    this._setMbLinePolygonProeprties(mbMap);
  }

  _syncSourceBindingWithMb(mbMap) {
    const mbSource = mbMap.getSource(this.getId());
    if (!mbSource) {
      mbMap.addSource(this.getId(), {
        type: 'geojson',
        data: { 'type': 'FeatureCollection', 'features': [] }
      });
    }
  }

  syncLayerWithMB(mbMap) {
    this._syncSourceBindingWithMb(mbMap);
    this._syncFeatureCollectionWithMb(mbMap);
    this._syncStylePropertiesWithMb(mbMap);
  }

  renderStyleEditor(style, options) {
    return style.renderEditor({
      layer: this,
      ...options
    });
  }

  _canShowTooltips() {
    return this._source.canFormatFeatureProperties();
  }


  async _getPropertiesForTooltip(feature) {
    const tooltipsFromSource =  await this._source.filterAndFormatProperties(feature.properties);

    //add tooltips from joins
    const allProps = this._joins.reduce((acc, join) => {
      const propsFromJoin = join.filterAndFormatPropertiesForTooltip(feature.properties);
      return {
        ...propsFromJoin,
        ...acc,
      };
    }, { ...tooltipsFromSource });

    return allProps;
  }

  _addTooltipListeners(mbMap, mbLayerId) {

    if (!this._canShowTooltips()) {
      return;
    }

    const showTooltip = async (feature, eventLngLat) => {
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

      const properties = await this._getPropertiesForTooltip(feature);

      ReactDOM.render(
        React.createElement(
          FeatureTooltip, {
            properties: properties,
          }
        ),
        VectorLayer.tooltipContainer
      );

      VectorLayer.popup.setLngLat(popupAnchorLocation)
        .setDOMContent(VectorLayer.tooltipContainer)
        .addTo(mbMap);
    };

    let activeFeature;
    let isTooltipOpen = false;
    mbMap.on('mousemove', mbLayerId, _.debounce((e) => {
      if (!isTooltipOpen) {
        return;
      }

      const features = mbMap.queryRenderedFeatures(e.point)
        .filter(feature => {
          return feature.layer.source === this.getId();
        });
      if (features.length === 0) {
        return;
      }

      const propertiesUnchanged = _.isEqual(activeFeature.properties, features[0].properties);
      const geometryUnchanged = _.isEqual(activeFeature.geometry, features[0].geometry);
      if(propertiesUnchanged && geometryUnchanged) {
        // mouse over same feature, no need to update tooltip
        return;
      }

      activeFeature = features[0];
      showTooltip(activeFeature, e.lngLat);
    }, 100));

    mbMap.on('mouseenter', mbLayerId, (e) => {
      isTooltipOpen = true;
      mbMap.getCanvas().style.cursor = 'pointer';

      activeFeature = e.features[0];
      showTooltip(activeFeature, e.lngLat);
    });

    mbMap.on('mouseleave', mbLayerId, () => {
      isTooltipOpen = false;
      mbMap.getCanvas().style.cursor = '';
      VectorLayer.popup.remove();
      ReactDOM.unmountComponentAtNode(VectorLayer.tooltipContainer);
    });
  }
}
