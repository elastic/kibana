/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import turf from 'turf';
import { AbstractLayer } from './layer';
import { VectorStyle } from './styles/vector_style';
import { LeftInnerJoin } from './joins/left_inner_join';
import { FEATURE_ID_PROPERTY_NAME, SOURCE_DATA_ID_ORIGIN } from '../../../common/constants';
import _ from 'lodash';

const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: []
};


const CLOSED_SHAPE_MB_FILTER = [
  'any',
  ['==', ['geometry-type'], 'Polygon'],
  ['==', ['geometry-type'], 'MultiPolygon']
];

const ALL_SHAPE_MB_FILTER = [
  'any',
  ['==', ['geometry-type'], 'Polygon'],
  ['==', ['geometry-type'], 'MultiPolygon'],
  ['==', ['geometry-type'], 'LineString'],
  ['==', ['geometry-type'], 'MultiLineString']
];

export class VectorLayer extends AbstractLayer {

  static type = 'VECTOR';

  static createDescriptor(options, mapColors) {
    const layerDescriptor = super.createDescriptor(options);
    layerDescriptor.type = VectorLayer.type;

    if (!options.style) {
      const styleProperties = VectorStyle.createDefaultStyleProperties(mapColors);
      layerDescriptor.style = VectorStyle.createDescriptor(styleProperties);
    }

    return layerDescriptor;
  }

  constructor(options) {
    super(options);
    this._joins =  [];
    if (options.layerDescriptor.joins) {
      options.layerDescriptor.joins.forEach((joinDescriptor) => {
        this._joins.push(new LeftInnerJoin(joinDescriptor, this._source.getInspectorAdapters()));
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

  getLayerTypeIconName() {
    return 'vector';
  }

  getTOCDetails() {
    return this._style.getTOCDetails();
  }

  _getBoundsBasedOnData() {
    const featureCollection = this._getSourceFeatureCollection();
    if (!featureCollection) {
      return null;
    }
    const bbox =  turf.bbox(featureCollection);
    return {
      min_lon: bbox[0],
      min_lat: bbox[1],
      max_lon: bbox[2],
      max_lat: bbox[3]
    };
  }

  async getBounds(dataFilters) {
    if (this._source.isBoundsAware()) {
      const searchFilters = this._getSearchFilters(dataFilters);
      return await this._source.getBoundsForFilters(searchFilters);
    }
    return this._getBoundsBasedOnData();
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
        origin: SOURCE_DATA_ID_ORIGIN
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

  async _canSkipSourceUpdate(source, sourceDataId, searchFilters) {
    const timeAware = await source.isTimeAware();
    const refreshTimerAware = await source.isRefreshTimerAware();
    const extentAware = source.isFilterByMapBounds();
    const isFieldAware = source.isFieldAware();
    const isQueryAware = source.isQueryAware();
    const isGeoGridPrecisionAware = source.isGeoGridPrecisionAware();

    if (
      !timeAware &&
      !refreshTimerAware &&
      !extentAware &&
      !isFieldAware &&
      !isQueryAware &&
      !isGeoGridPrecisionAware
    ) {
      const sourceDataRequest = this._findDataRequestForSource(sourceDataId);
      return (sourceDataRequest && sourceDataRequest.hasDataOrRequestInProgress());
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
      updateDueToTime = !_.isEqual(meta.timeFilters, searchFilters.timeFilters);
    }

    let updateDueToRefreshTimer = false;
    if (refreshTimerAware && searchFilters.refreshTimerLastTriggeredAt) {
      updateDueToRefreshTimer = !_.isEqual(meta.refreshTimerLastTriggeredAt, searchFilters.refreshTimerLastTriggeredAt);
    }

    let updateDueToFields = false;
    if (isFieldAware) {
      updateDueToFields = !_.isEqual(meta.fieldNames, searchFilters.fieldNames);
    }

    let updateDueToQuery = false;
    let updateDueToFilters = false;
    let updateDueToLayerQuery = false;
    if (isQueryAware) {
      updateDueToQuery = !_.isEqual(meta.query, searchFilters.query);
      updateDueToFilters = !_.isEqual(meta.filters, searchFilters.filters);
      updateDueToLayerQuery = !_.isEqual(meta.layerQuery, searchFilters.layerQuery);
    }

    let updateDueToPrecisionChange = false;
    if (isGeoGridPrecisionAware) {
      updateDueToPrecisionChange = !_.isEqual(meta.geogridPrecision, searchFilters.geogridPrecision);
    }

    const updateDueToExtentChange = this.updateDueToExtent(source, meta, searchFilters);

    return !updateDueToTime
      && !updateDueToRefreshTimer
      && !updateDueToExtentChange
      && !updateDueToFields
      && !updateDueToQuery
      && !updateDueToFilters
      && !updateDueToLayerQuery
      && !updateDueToPrecisionChange;
  }

  async _syncJoin(join, { startLoading, stopLoading, onLoadError, dataFilters }) {

    const joinSource = join.getJoinSource();
    const sourceDataId = join.getSourceId();
    const requestToken = Symbol(`layer-join-refresh:${ this.getId()} - ${sourceDataId}`);

    try {
      const canSkip = await this._canSkipSourceUpdate(joinSource, sourceDataId, dataFilters);
      if (canSkip) {
        const sourceDataRequest = this._findDataRequestForSource(sourceDataId);
        const propertiesMap = sourceDataRequest ? sourceDataRequest.getData() : null;
        return {
          dataHasChanged: false,
          join: join,
          propertiesMap: propertiesMap
        };
      }
      startLoading(sourceDataId, requestToken, dataFilters);
      const leftSourceName = await this.getSourceName();
      const {
        propertiesMap
      } = await joinSource.getPropertiesMap(dataFilters, leftSourceName, join.getLeftFieldName());
      stopLoading(sourceDataId, requestToken, propertiesMap);
      return {
        dataHasChanged: true,
        join: join,
        propertiesMap: propertiesMap,
      };
    } catch(e) {
      onLoadError(sourceDataId, requestToken, `Join error: ${e.message}`);
      return {
        dataHasChanged: false,
        join: join,
        propertiesMap: null
      };
    }
  }


  async _syncJoins({ startLoading, stopLoading, onLoadError, dataFilters }) {
    const joinSyncs = this.getValidJoins().map(async join => {
      return this._syncJoin(join, { startLoading, stopLoading, onLoadError, dataFilters });
    });
    return await Promise.all(joinSyncs);
  }

  _getSearchFilters(dataFilters) {
    const fieldNames = [
      ...this._source.getFieldNames(),
      ...this._style.getSourceFieldNames(),
      ...this.getValidJoins().map(join => {
        return join.getLeftFieldName();
      })
    ];

    return {
      ...dataFilters,
      fieldNames: _.uniq(fieldNames).sort(),
      geogridPrecision: this._source.getGeoGridPrecision(dataFilters.zoom),
      layerQuery: this.getQuery()
    };
  }

  async _syncSource({ startLoading, stopLoading, onLoadError, dataFilters }) {

    const requestToken = Symbol(`layer-source-refresh:${ this.getId()} - source`);

    const searchFilters = this._getSearchFilters(dataFilters);
    const canSkip = await this._canSkipSourceUpdate(this._source, SOURCE_DATA_ID_ORIGIN, searchFilters);
    if (canSkip) {
      const sourceDataRequest = this.getSourceDataRequest();
      return {
        refreshed: false,
        featureCollection: sourceDataRequest.getData()
      };
    }

    try {
      startLoading(SOURCE_DATA_ID_ORIGIN, requestToken, searchFilters);
      const layerName = await this.getDisplayName();
      const { data: featureCollection, meta } = await this._source.getGeoJsonWithMeta(layerName, searchFilters);
      this._assignIdsToFeatures(featureCollection);
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, featureCollection, meta);
      return {
        refreshed: true,
        featureCollection: featureCollection
      };
    } catch (error) {
      onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
      return  {
        refreshed: false
      };
    }
  }


  _assignIdsToFeatures(featureCollection) {
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      feature.properties[FEATURE_ID_PROPERTY_NAME] = (typeof feature.id === 'string' || typeof feature.id === 'number')  ? feature.id : i;
    }
  }

  _joinToFeatureCollection(sourceResult, joinState, updateSourceData) {
    if (!sourceResult.refreshed && !joinState.dataHasChanged) {
      //no data changes in both the source data or the join data
      return false;
    }
    if (!sourceResult.featureCollection || !joinState.propertiesMap) {
      //no data available in source or join (ie. request is pending or data errored)
      return false;
    }

    //all other cases, perform the join
    //- source data changed but join data has not
    //- join data changed but source data has not
    //- both source and join data changed
    const updatedFeatureCollection = joinState.join.joinPropertiesToFeatureCollection(
      sourceResult.featureCollection,
      joinState.propertiesMap);

    updateSourceData(updatedFeatureCollection);

    return true;
  }

  async _performJoins(sourceResult, joinStates, updateSourceData) {
    const hasJoined = joinStates.map(joinState => {
      return this._joinToFeatureCollection(sourceResult, joinState, updateSourceData);
    });
    return hasJoined.some(shouldRefresh => shouldRefresh === true);
  }

  async syncData({ startLoading, stopLoading, onLoadError, onRefreshStyle, dataFilters, updateSourceData }) {
    if (!this.isVisible() || !this.showAtZoomLevel(dataFilters.zoom)) {
      return;
    }
    const sourceResult = await this._syncSource({ startLoading, stopLoading, onLoadError, dataFilters });
    const joinResults = await this._syncJoins({ startLoading, stopLoading, onLoadError, dataFilters });
    const shouldRefresh = await this._performJoins(sourceResult, joinResults, updateSourceData);
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

    const dataBoundToMap = AbstractLayer.getBoundDataForSource(mbMap, this.getId());
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
    const pointLayerId = this._getMbPointLayerId();
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
    this._style.setMBPaintPropertiesForPoints({
      alpha: this.getAlpha(),
      mbMap,
      pointLayerId: pointLayerId,
    });
    mbMap.setLayoutProperty(pointLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayerZoomRange(pointLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
  }

  _setMbLinePolygonProperties(mbMap) {
    const sourceId = this.getId();
    const fillLayerId = this._getMbPolygonLayerId();
    const lineLayerId = this._getMbLineLayerId();
    if (!mbMap.getLayer(fillLayerId)) {
      mbMap.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {}
      });
      mbMap.setFilter(fillLayerId, CLOSED_SHAPE_MB_FILTER);
    }
    if (!mbMap.getLayer(lineLayerId)) {
      mbMap.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {}
      });
      mbMap.setFilter(lineLayerId, ALL_SHAPE_MB_FILTER);
    }
    this._style.setMBPaintProperties({
      alpha: this.getAlpha(),
      mbMap,
      fillLayerId,
      lineLayerId,
    });
    mbMap.setLayoutProperty(fillLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayoutProperty(lineLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    mbMap.setLayerZoomRange(lineLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    mbMap.setLayerZoomRange(fillLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
  }

  _syncStylePropertiesWithMb(mbMap) {
    this._setMbPointsProperties(mbMap);
    this._setMbLinePolygonProperties(mbMap);
  }

  _syncSourceBindingWithMb(mbMap) {
    const mbSource = mbMap.getSource(this.getId());
    if (!mbSource) {
      mbMap.addSource(this.getId(), {
        type: 'geojson',
        data: EMPTY_FEATURE_COLLECTION
      });
    }
  }

  syncLayerWithMB(mbMap) {
    this._syncSourceBindingWithMb(mbMap);
    this._syncFeatureCollectionWithMb(mbMap);
    this._syncStylePropertiesWithMb(mbMap);
  }

  renderStyleEditor(Style, options) {
    return Style.renderEditor({
      layer: this,
      ...options
    });
  }

  _getMbPointLayerId() {
    return this.getId() +  '_circle';
  }

  _getMbLineLayerId() {
    return this.getId() + '_line';
  }

  _getMbPolygonLayerId() {
    return this.getId() + '_fill';
  }

  getMbLayerIds() {
    return [this._getMbPointLayerId(), this._getMbLineLayerId(), this._getMbPolygonLayerId()];
  }

  async getPropertiesForTooltip(properties) {
    const tooltipsFromSource =  await this._source.filterAndFormatPropertiesToHtml(properties);
    for (let i = 0; i < this._joins.length; i++) {
      const propsFromJoin = await this._joins[i].filterAndFormatPropertiesForTooltip(properties);
      Object.assign(tooltipsFromSource, propsFromJoin);
    }
    return tooltipsFromSource;
  }

  canShowTooltip() {
    return this._source.canFormatFeatureProperties();
  }

  getFeatureByFeatureById(id) {
    const featureCollection = this._getSourceFeatureCollection(id);
    if (!featureCollection) {
      return;
    }

    return featureCollection.features.find((feature) => {
      return feature.properties[FEATURE_ID_PROPERTY_NAME] === id;
    });
  }

}
