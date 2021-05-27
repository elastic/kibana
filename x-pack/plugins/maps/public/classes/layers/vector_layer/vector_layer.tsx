/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  Map as MbMap,
  AnyLayer as MbLayer,
  GeoJSONSource as MbGeoJSONSource,
} from '@kbn/mapbox-gl';
import { Feature, FeatureCollection, GeoJsonProperties } from 'geojson';
import _ from 'lodash';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AbstractLayer } from '../layer';
import { IVectorStyle, VectorStyle } from '../../styles/vector/vector_style';
import {
  FEATURE_ID_PROPERTY_NAME,
  SOURCE_META_DATA_REQUEST_ID,
  SOURCE_FORMATTERS_DATA_REQUEST_ID,
  FEATURE_VISIBLE_PROPERTY_NAME,
  EMPTY_FEATURE_COLLECTION,
  KBN_TOO_MANY_FEATURES_PROPERTY,
  LAYER_TYPE,
  FIELD_ORIGIN,
  KBN_TOO_MANY_FEATURES_IMAGE_ID,
  FieldFormatter,
} from '../../../../common/constants';
import { JoinTooltipProperty } from '../../tooltips/join_tooltip_property';
import { DataRequestAbortError } from '../../util/data_request';
import {
  canSkipSourceUpdate,
  canSkipStyleMetaUpdate,
  canSkipFormattersUpdate,
} from '../../util/can_skip_fetch';
import { getFeatureCollectionBounds } from '../../util/get_feature_collection_bounds';
import {
  getCentroidFilterExpression,
  getFillFilterExpression,
  getLineFilterExpression,
  getPointFilterExpression,
} from '../../util/mb_filter_expressions';

import {
  DynamicStylePropertyOptions,
  MapFilters,
  MapQuery,
  VectorJoinSourceRequestMeta,
  VectorLayerDescriptor,
  VectorSourceRequestMeta,
  VectorStyleRequestMeta,
} from '../../../../common/descriptor_types';
import { IVectorSource } from '../../sources/vector_source';
import { CustomIconAndTooltipContent, ILayer } from '../layer';
import { InnerJoin } from '../../joins/inner_join';
import { IField } from '../../fields/field';
import { DataRequestContext } from '../../../actions';
import { ITooltipProperty } from '../../tooltips/tooltip_property';
import { IDynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import { IESSource } from '../../sources/es_source';
import { PropertiesMap } from '../../../../common/elasticsearch_util';
import { ITermJoinSource } from '../../sources/term_join_source';
import { addGeoJsonMbSource, getVectorSourceBounds, syncVectorSource } from './utils';

interface SourceResult {
  refreshed: boolean;
  featureCollection?: FeatureCollection;
}

interface JoinState {
  dataHasChanged: boolean;
  join: InnerJoin;
  propertiesMap?: PropertiesMap;
}

export interface VectorLayerArguments {
  source: IVectorSource;
  joins?: InnerJoin[];
  layerDescriptor: VectorLayerDescriptor;
  chartsPaletteServiceGetColor?: (value: string) => string | null;
}

export interface IVectorLayer extends ILayer {
  getFields(): Promise<IField[]>;
  getStyleEditorFields(): Promise<IField[]>;
  getJoins(): InnerJoin[];
  getValidJoins(): InnerJoin[];
  getSource(): IVectorSource;
  getFeatureById(id: string | number): Feature | null;
  getPropertiesForTooltip(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
  hasJoins(): boolean;
  canShowTooltip(): boolean;
  getLeftJoinFields(): Promise<IField[]>;
}

export class VectorLayer extends AbstractLayer implements IVectorLayer {
  static type = LAYER_TYPE.VECTOR;

  protected readonly _style: IVectorStyle;
  private readonly _joins: InnerJoin[];

  static createDescriptor(
    options: Partial<VectorLayerDescriptor>,
    mapColors?: string[]
  ): VectorLayerDescriptor {
    const layerDescriptor = super.createDescriptor(options);
    layerDescriptor.type = VectorLayer.type;

    if (!options.style) {
      const styleProperties = VectorStyle.createDefaultStyleProperties(mapColors ? mapColors : []);
      layerDescriptor.style = VectorStyle.createDescriptor(styleProperties);
    }

    if (!options.joins) {
      layerDescriptor.joins = [];
    }

    return layerDescriptor as VectorLayerDescriptor;
  }

  constructor({
    layerDescriptor,
    source,
    joins = [],
    chartsPaletteServiceGetColor,
  }: VectorLayerArguments) {
    super({
      layerDescriptor,
      source,
    });
    this._joins = joins;
    this._style = new VectorStyle(
      layerDescriptor.style,
      source,
      this,
      chartsPaletteServiceGetColor
    );
  }

  getSource(): IVectorSource {
    return super.getSource() as IVectorSource;
  }

  getStyleForEditing(): IVectorStyle {
    return this._style;
  }

  getStyle(): IVectorStyle {
    return this._style;
  }

  getCurrentStyle(): IVectorStyle {
    return this._style;
  }

  destroy() {
    if (this.getSource()) {
      this.getSource().destroy();
    }
    this.getJoins().forEach((joinSource) => {
      joinSource.destroy();
    });
  }

  getJoins() {
    return this._joins.slice();
  }

  getValidJoins() {
    return this.getJoins().filter((join) => {
      return join.hasCompleteConfig();
    });
  }

  hasJoins() {
    return this.getValidJoins().length > 0;
  }

  isInitialDataLoadComplete() {
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest || !sourceDataRequest.hasData()) {
      return false;
    }

    const joins = this.getValidJoins();
    for (let i = 0; i < joins.length; i++) {
      const joinDataRequest = this.getDataRequest(joins[i].getSourceDataRequestId());
      if (!joinDataRequest || !joinDataRequest.hasData()) {
        return false;
      }
    }

    return true;
  }

  getCustomIconAndTooltipContent(): CustomIconAndTooltipContent {
    const featureCollection = this._getSourceFeatureCollection();

    const noResultsIcon = <EuiIcon size="m" color="subdued" type="minusInCircle" />;
    if (!featureCollection || featureCollection.features.length === 0) {
      return {
        icon: noResultsIcon,
        tooltipContent: i18n.translate('xpack.maps.vectorLayer.noResultsFoundTooltip', {
          defaultMessage: `No results found.`,
        }),
      };
    }

    if (
      this.getJoins().length &&
      !featureCollection.features.some(
        (feature) => feature.properties?.[FEATURE_VISIBLE_PROPERTY_NAME]
      )
    ) {
      return {
        icon: noResultsIcon,
        tooltipContent: i18n.translate('xpack.maps.vectorLayer.noResultsFoundInJoinTooltip', {
          defaultMessage: `No matching results found in term joins`,
        }),
      };
    }

    const sourceDataRequest = this.getSourceDataRequest();
    const { tooltipContent, areResultsTrimmed } = this.getSource().getSourceTooltipContent(
      sourceDataRequest
    );
    return {
      icon: this.getCurrentStyle().getIcon(),
      tooltipContent,
      areResultsTrimmed,
    };
  }

  getLayerTypeIconName() {
    return 'vector';
  }

  async hasLegendDetails() {
    return this.getCurrentStyle().hasLegendDetails();
  }

  renderLegendDetails() {
    return this.getCurrentStyle().renderLegendDetails();
  }

  async getBounds(syncContext: DataRequestContext) {
    const isStaticLayer = !this.getSource().isBoundsAware();
    return isStaticLayer || this.hasJoins()
      ? getFeatureCollectionBounds(this._getSourceFeatureCollection(), this.hasJoins())
      : getVectorSourceBounds({
          layerId: this.getId(),
          syncContext,
          source: this.getSource(),
          sourceQuery: this.getQuery() as MapQuery,
        });
  }

  async getLeftJoinFields() {
    return await this.getSource().getLeftJoinFields();
  }

  _getJoinFields() {
    const joinFields: IField[] = [];
    this.getValidJoins().forEach((join) => {
      const fields = join.getJoinFields();
      joinFields.push(...fields);
    });
    return joinFields;
  }

  async getFields() {
    const sourceFields = await this.getSource().getFields();
    return [...sourceFields, ...this._getJoinFields()];
  }

  async getStyleEditorFields() {
    const sourceFields = await (this.getSourceForEditing() as IVectorSource).getFields();
    return [...sourceFields, ...this._getJoinFields()];
  }

  getIndexPatternIds() {
    const indexPatternIds = this.getSource().getIndexPatternIds();
    this.getValidJoins().forEach((join) => {
      indexPatternIds.push(...join.getIndexPatternIds());
    });
    return indexPatternIds;
  }

  getQueryableIndexPatternIds() {
    const indexPatternIds = this.getSource().getQueryableIndexPatternIds();
    this.getValidJoins().forEach((join) => {
      indexPatternIds.push(...join.getQueryableIndexPatternIds());
    });
    return indexPatternIds;
  }

  async isFilteredByGlobalTime(): Promise<boolean> {
    if (this.getSource().getApplyGlobalTime() && (await this.getSource().isTimeAware())) {
      return true;
    }

    const joinPromises = this.getValidJoins().map(async (join) => {
      return (
        join.getRightJoinSource().getApplyGlobalTime() &&
        (await join.getRightJoinSource().isTimeAware())
      );
    });
    return (await Promise.all(joinPromises)).some((isJoinTimeAware: boolean) => {
      return isJoinTimeAware;
    });
  }

  async _syncJoin({
    join,
    startLoading,
    stopLoading,
    onLoadError,
    registerCancelCallback,
    dataFilters,
  }: { join: InnerJoin } & DataRequestContext): Promise<JoinState> {
    const joinSource = join.getRightJoinSource();
    const sourceDataId = join.getSourceDataRequestId();
    const requestToken = Symbol(`layer-join-refresh:${this.getId()} - ${sourceDataId}`);
    const searchFilters: VectorJoinSourceRequestMeta = {
      ...dataFilters,
      fieldNames: joinSource.getFieldNames(),
      sourceQuery: joinSource.getWhereQuery(),
      applyGlobalQuery: joinSource.getApplyGlobalQuery(),
      applyGlobalTime: joinSource.getApplyGlobalTime(),
      sourceMeta: joinSource.getSyncMeta(),
    };
    const prevDataRequest = this.getDataRequest(sourceDataId);

    const canSkipFetch = await canSkipSourceUpdate({
      source: joinSource,
      prevDataRequest,
      nextMeta: searchFilters,
      extentAware: false, // join-sources are term-aggs that are spatially unaware (e.g. ESTermSource/TableSource).
    });
    if (canSkipFetch) {
      return {
        dataHasChanged: false,
        join,
        propertiesMap: prevDataRequest?.getData() as PropertiesMap,
      };
    }

    try {
      startLoading(sourceDataId, requestToken, searchFilters);
      const leftSourceName = await this._source.getDisplayName();
      const propertiesMap = await joinSource.getPropertiesMap(
        searchFilters,
        leftSourceName,
        join.getLeftField().getName(),
        registerCancelCallback.bind(null, requestToken)
      );
      stopLoading(sourceDataId, requestToken, propertiesMap);
      return {
        dataHasChanged: true,
        join,
        propertiesMap,
      };
    } catch (error) {
      if (!(error instanceof DataRequestAbortError)) {
        onLoadError(sourceDataId, requestToken, `Join error: ${error.message}`);
      }
      throw error;
    }
  }

  async _syncJoins(syncContext: DataRequestContext, style: IVectorStyle) {
    const joinSyncs = this.getValidJoins().map(async (join) => {
      await this._syncJoinStyleMeta(syncContext, join, style);
      await this._syncJoinFormatters(syncContext, join, style);
      return this._syncJoin({ join, ...syncContext });
    });

    return await Promise.all(joinSyncs);
  }

  _getSearchFilters(
    dataFilters: MapFilters,
    source: IVectorSource,
    style: IVectorStyle
  ): VectorSourceRequestMeta {
    const fieldNames = [
      ...source.getFieldNames(),
      ...style.getSourceFieldNames(),
      ...this.getValidJoins().map((join) => join.getLeftField().getName()),
    ];

    const sourceQuery = this.getQuery() as MapQuery;
    return {
      ...dataFilters,
      fieldNames: _.uniq(fieldNames).sort(),
      geogridPrecision: source.getGeoGridPrecision(dataFilters.zoom),
      sourceQuery: sourceQuery ? sourceQuery : undefined,
      applyGlobalQuery: source.getApplyGlobalQuery(),
      applyGlobalTime: source.getApplyGlobalTime(),
      sourceMeta: source.getSyncMeta(),
    };
  }

  _performInnerJoins(
    sourceResult: SourceResult,
    joinStates: JoinState[],
    updateSourceData: DataRequestContext['updateSourceData']
  ) {
    // should update the store if
    // -- source result was refreshed
    // -- any of the join configurations changed (joinState changed)
    // -- visibility of any of the features has changed

    let shouldUpdateStore =
      sourceResult.refreshed || joinStates.some((joinState) => joinState.dataHasChanged);

    if (!shouldUpdateStore) {
      return;
    }

    for (let i = 0; i < sourceResult.featureCollection!.features.length; i++) {
      const feature = sourceResult.featureCollection!.features[i];
      if (!feature.properties) {
        feature.properties = {};
      }
      const oldVisbility = feature.properties[FEATURE_VISIBLE_PROPERTY_NAME];
      let isFeatureVisible = true;
      for (let j = 0; j < joinStates.length; j++) {
        const joinState = joinStates[j];
        const innerJoin = joinState.join;
        const canJoinOnCurrent = joinState.propertiesMap
          ? innerJoin.joinPropertiesToFeature(feature, joinState.propertiesMap)
          : false;
        isFeatureVisible = isFeatureVisible && canJoinOnCurrent;
      }

      if (oldVisbility !== isFeatureVisible) {
        shouldUpdateStore = true;
      }

      feature.properties[FEATURE_VISIBLE_PROPERTY_NAME] = isFeatureVisible;
    }

    if (shouldUpdateStore) {
      updateSourceData({ ...sourceResult.featureCollection });
    }
  }

  async _syncSourceStyleMeta(
    syncContext: DataRequestContext,
    source: IVectorSource,
    style: IVectorStyle
  ) {
    const sourceQuery = this.getQuery() as MapQuery;
    return this._syncStyleMeta({
      source,
      style,
      sourceQuery: sourceQuery ? sourceQuery : undefined,
      dataRequestId: SOURCE_META_DATA_REQUEST_ID,
      dynamicStyleProps: style.getDynamicPropertiesArray().filter((dynamicStyleProp) => {
        return (
          dynamicStyleProp.getFieldOrigin() === FIELD_ORIGIN.SOURCE &&
          dynamicStyleProp.isFieldMetaEnabled()
        );
      }),
      ...syncContext,
    });
  }

  async _syncJoinStyleMeta(syncContext: DataRequestContext, join: InnerJoin, style: IVectorStyle) {
    const joinSource = join.getRightJoinSource();
    return this._syncStyleMeta({
      source: joinSource,
      style,
      sourceQuery: joinSource.getWhereQuery(),
      dataRequestId: join.getSourceMetaDataRequestId(),
      dynamicStyleProps: this.getCurrentStyle()
        .getDynamicPropertiesArray()
        .filter((dynamicStyleProp) => {
          const matchingField = joinSource.getFieldByName(dynamicStyleProp.getFieldName());
          return (
            dynamicStyleProp.getFieldOrigin() === FIELD_ORIGIN.JOIN &&
            !!matchingField &&
            dynamicStyleProp.isFieldMetaEnabled()
          );
        }),
      ...syncContext,
    });
  }

  async _syncStyleMeta({
    source,
    style,
    sourceQuery,
    dataRequestId,
    dynamicStyleProps,
    dataFilters,
    startLoading,
    stopLoading,
    onLoadError,
    registerCancelCallback,
  }: {
    dataRequestId: string;
    dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
    source: IVectorSource | ITermJoinSource;
    sourceQuery?: MapQuery;
    style: IVectorStyle;
  } & DataRequestContext) {
    if (!source.isESSource() || dynamicStyleProps.length === 0) {
      return;
    }

    const dynamicStyleFields = dynamicStyleProps.map((dynamicStyleProp) => {
      return `${dynamicStyleProp.getFieldName()}${dynamicStyleProp.getStyleMetaHash()}`;
    });

    const nextMeta = {
      dynamicStyleFields: _.uniq(dynamicStyleFields).sort(),
      sourceQuery,
      isTimeAware: this.getCurrentStyle().isTimeAware() && (await source.isTimeAware()),
      timeFilters: dataFilters.timeFilters,
      searchSessionId: dataFilters.searchSessionId,
    } as VectorStyleRequestMeta;
    const prevDataRequest = this.getDataRequest(dataRequestId);
    const canSkipFetch = canSkipStyleMetaUpdate({ prevDataRequest, nextMeta });
    if (canSkipFetch) {
      return;
    }

    const requestToken = Symbol(`layer-${this.getId()}-${dataRequestId}`);
    try {
      startLoading(dataRequestId, requestToken, nextMeta);
      const layerName = await this.getDisplayName(source);

      const styleMeta = await (source as IESSource).loadStylePropsMeta({
        layerName,
        style,
        dynamicStyleProps,
        registerCancelCallback: registerCancelCallback.bind(null, requestToken),
        sourceQuery: nextMeta.sourceQuery,
        timeFilters: nextMeta.timeFilters,
        searchSessionId: dataFilters.searchSessionId,
      });
      stopLoading(dataRequestId, requestToken, styleMeta, nextMeta);
    } catch (error) {
      if (!(error instanceof DataRequestAbortError)) {
        onLoadError(dataRequestId, requestToken, error.message);
      }
      throw error;
    }
  }

  async _syncSourceFormatters(
    syncContext: DataRequestContext,
    source: IVectorSource,
    style: IVectorStyle
  ) {
    return this._syncFormatters({
      source,
      dataRequestId: SOURCE_FORMATTERS_DATA_REQUEST_ID,
      fields: style
        .getDynamicPropertiesArray()
        .filter((dynamicStyleProp) => {
          return dynamicStyleProp.getFieldOrigin() === FIELD_ORIGIN.SOURCE;
        })
        .map((dynamicStyleProp) => {
          return dynamicStyleProp.getField()!;
        }),
      ...syncContext,
    });
  }

  async _syncJoinFormatters(syncContext: DataRequestContext, join: InnerJoin, style: IVectorStyle) {
    const joinSource = join.getRightJoinSource();
    return this._syncFormatters({
      source: joinSource,
      dataRequestId: join.getSourceFormattersDataRequestId(),
      fields: style
        .getDynamicPropertiesArray()
        .filter((dynamicStyleProp) => {
          const matchingField = joinSource.getFieldByName(dynamicStyleProp.getFieldName());
          return dynamicStyleProp.getFieldOrigin() === FIELD_ORIGIN.JOIN && !!matchingField;
        })
        .map((dynamicStyleProp) => {
          return dynamicStyleProp.getField()!;
        }),
      ...syncContext,
    });
  }

  async _syncFormatters({
    source,
    dataRequestId,
    fields,
    startLoading,
    stopLoading,
    onLoadError,
  }: {
    dataRequestId: string;
    fields: IField[];
    source: IVectorSource | ITermJoinSource;
  } & DataRequestContext) {
    if (fields.length === 0) {
      return;
    }

    const fieldNames = fields.map((field) => {
      return field.getName();
    });
    const nextMeta = {
      fieldNames: _.uniq(fieldNames).sort(),
    };
    const prevDataRequest = this.getDataRequest(dataRequestId);
    const canSkipUpdate = canSkipFormattersUpdate({ prevDataRequest, nextMeta });
    if (canSkipUpdate) {
      return;
    }

    const requestToken = Symbol(`layer-${this.getId()}-${dataRequestId}`);
    try {
      startLoading(dataRequestId, requestToken, nextMeta);

      const formatters: { [key: string]: FieldFormatter | null } = {};
      const promises = fields
        .filter((field) => {
          return field.canValueBeFormatted();
        })
        .map(async (field) => {
          formatters[field.getName()] = await source.createFieldFormatter(field);
        });
      await Promise.all(promises);

      stopLoading(dataRequestId, requestToken, formatters, nextMeta);
    } catch (error) {
      onLoadError(dataRequestId, requestToken, error.message);
      throw error;
    }
  }

  async syncData(syncContext: DataRequestContext) {
    await this._syncData(syncContext, this.getSource(), this.getCurrentStyle());
  }

  // TLDR: Do not call getSource or getCurrentStyle in syncData flow. Use 'source' and 'style' arguments instead.
  //
  // 1) State is contained in the redux store. Layer instance state is readonly.
  // 2) Even though data request descriptor updates trigger new instances for rendering,
  // syncing data executes on a single object instance. Syncing data can not use updated redux store state.
  //
  // Blended layer data syncing branches on the source/style depending on whether clustering is used or not.
  // Given 1 above, which source/style to use can not be stored in Layer instance state.
  // Given 2 above, which source/style to use can not be pulled from data request state.
  // Therefore, source and style are provided as arugments and must be used instead of calling getSource or getCurrentStyle.
  async _syncData(syncContext: DataRequestContext, source: IVectorSource, style: IVectorStyle) {
    if (this.isLoadingBounds()) {
      return;
    }

    try {
      await this._syncSourceStyleMeta(syncContext, source, style);
      await this._syncSourceFormatters(syncContext, source, style);
      const sourceResult = await syncVectorSource({
        layerId: this.getId(),
        layerName: await this.getDisplayName(source),
        prevDataRequest: this.getSourceDataRequest(),
        requestMeta: this._getSearchFilters(syncContext.dataFilters, source, style),
        syncContext,
        source,
      });
      if (
        !sourceResult.featureCollection ||
        !sourceResult.featureCollection.features.length ||
        !this.hasJoins()
      ) {
        return;
      }

      const joinStates = await this._syncJoins(syncContext, style);
      this._performInnerJoins(sourceResult, joinStates, syncContext.updateSourceData);
    } catch (error) {
      if (!(error instanceof DataRequestAbortError)) {
        throw error;
      }
    }
  }

  _getSourceFeatureCollection() {
    const sourceDataRequest = this.getSourceDataRequest();
    return sourceDataRequest ? (sourceDataRequest.getData() as FeatureCollection) : null;
  }

  _syncFeatureCollectionWithMb(mbMap: MbMap) {
    const mbGeoJSONSource = mbMap.getSource(this.getId()) as MbGeoJSONSource;
    const featureCollection = this._getSourceFeatureCollection();
    const featureCollectionOnMap = AbstractLayer.getBoundDataForSource(mbMap, this.getId());

    if (!featureCollection) {
      if (featureCollectionOnMap) {
        this.getCurrentStyle().clearFeatureState(featureCollectionOnMap, mbMap, this.getId());
      }
      mbGeoJSONSource.setData(EMPTY_FEATURE_COLLECTION);
      return;
    }

    // "feature-state" data expressions are not supported with layout properties.
    // To work around this limitation,
    // scaled layout properties (like icon-size) must fall back to geojson property values :(
    const hasGeoJsonProperties = this.getCurrentStyle().setFeatureStateAndStyleProps(
      featureCollection,
      mbMap,
      this.getId()
    );
    if (featureCollection !== featureCollectionOnMap || hasGeoJsonProperties) {
      mbGeoJSONSource.setData(featureCollection);
    }
  }

  _setMbPointsProperties(mbMap: MbMap, mvtSourceLayer?: string) {
    const pointLayerId = this._getMbPointLayerId();
    const symbolLayerId = this._getMbSymbolLayerId();
    const pointLayer = mbMap.getLayer(pointLayerId);
    const symbolLayer = mbMap.getLayer(symbolLayerId);

    // Point layers symbolized as circles require 2 mapbox layers because
    // "circle" layers do not support "text" style properties
    // Point layers symbolized as icons only contain a single mapbox layer.
    let markerLayerId;
    let textLayerId;
    if (this.getCurrentStyle().arePointsSymbolizedAsCircles()) {
      markerLayerId = pointLayerId;
      textLayerId = this._getMbTextLayerId();
      if (symbolLayer) {
        mbMap.setLayoutProperty(symbolLayerId, 'visibility', 'none');
      }
      this._setMbCircleProperties(mbMap, mvtSourceLayer);
    } else {
      markerLayerId = symbolLayerId;
      textLayerId = symbolLayerId;
      if (pointLayer) {
        mbMap.setLayoutProperty(pointLayerId, 'visibility', 'none');
        mbMap.setLayoutProperty(this._getMbTextLayerId(), 'visibility', 'none');
      }
      this._setMbSymbolProperties(mbMap, mvtSourceLayer);
    }

    this.syncVisibilityWithMb(mbMap, markerLayerId);
    mbMap.setLayerZoomRange(markerLayerId, this.getMinZoom(), this.getMaxZoom());
    if (markerLayerId !== textLayerId) {
      this.syncVisibilityWithMb(mbMap, textLayerId);
      mbMap.setLayerZoomRange(textLayerId, this.getMinZoom(), this.getMaxZoom());
    }
  }

  _setMbCircleProperties(mbMap: MbMap, mvtSourceLayer?: string) {
    const sourceId = this.getId();
    const pointLayerId = this._getMbPointLayerId();
    const pointLayer = mbMap.getLayer(pointLayerId);
    if (!pointLayer) {
      const mbLayer: MbLayer = {
        id: pointLayerId,
        type: 'circle',
        source: sourceId,
        paint: {},
      };

      if (mvtSourceLayer) {
        mbLayer['source-layer'] = mvtSourceLayer;
      }
      mbMap.addLayer(mbLayer);
    }

    const textLayerId = this._getMbTextLayerId();
    const textLayer = mbMap.getLayer(textLayerId);
    if (!textLayer) {
      const mbLayer: MbLayer = {
        id: textLayerId,
        type: 'symbol',
        source: sourceId,
      };
      if (mvtSourceLayer) {
        mbLayer['source-layer'] = mvtSourceLayer;
      }
      mbMap.addLayer(mbLayer);
    }

    const filterExpr = getPointFilterExpression(this.hasJoins());
    if (!_.isEqual(filterExpr, mbMap.getFilter(pointLayerId))) {
      mbMap.setFilter(pointLayerId, filterExpr);
      mbMap.setFilter(textLayerId, filterExpr);
    }

    this.getCurrentStyle().setMBPaintPropertiesForPoints({
      alpha: this.getAlpha(),
      mbMap,
      pointLayerId,
    });

    this.getCurrentStyle().setMBPropertiesForLabelText({
      alpha: this.getAlpha(),
      mbMap,
      textLayerId,
    });
  }

  _setMbSymbolProperties(mbMap: MbMap, mvtSourceLayer?: string) {
    const sourceId = this.getId();
    const symbolLayerId = this._getMbSymbolLayerId();
    const symbolLayer = mbMap.getLayer(symbolLayerId);

    if (!symbolLayer) {
      const mbLayer: MbLayer = {
        id: symbolLayerId,
        type: 'symbol',
        source: sourceId,
      };
      if (mvtSourceLayer) {
        mbLayer['source-layer'] = mvtSourceLayer;
      }
      mbMap.addLayer(mbLayer);
    }

    const filterExpr = getPointFilterExpression(this.hasJoins());
    if (!_.isEqual(filterExpr, mbMap.getFilter(symbolLayerId))) {
      mbMap.setFilter(symbolLayerId, filterExpr);
    }

    this.getCurrentStyle().setMBSymbolPropertiesForPoints({
      alpha: this.getAlpha(),
      mbMap,
      symbolLayerId,
    });

    this.getCurrentStyle().setMBPropertiesForLabelText({
      alpha: this.getAlpha(),
      mbMap,
      textLayerId: symbolLayerId,
    });
  }

  _setMbLinePolygonProperties(mbMap: MbMap, mvtSourceLayer?: string) {
    const sourceId = this.getId();
    const fillLayerId = this._getMbPolygonLayerId();
    const lineLayerId = this._getMbLineLayerId();
    const tooManyFeaturesLayerId = this._getMbTooManyFeaturesLayerId();

    const hasJoins = this.hasJoins();
    if (!mbMap.getLayer(fillLayerId)) {
      const mbLayer: MbLayer = {
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {},
      };
      if (mvtSourceLayer) {
        mbLayer['source-layer'] = mvtSourceLayer;
      }
      mbMap.addLayer(mbLayer);
    }
    if (!mbMap.getLayer(lineLayerId)) {
      const mbLayer: MbLayer = {
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {},
      };
      if (mvtSourceLayer) {
        mbLayer['source-layer'] = mvtSourceLayer;
      }
      mbMap.addLayer(mbLayer);
    }
    if (!mbMap.getLayer(tooManyFeaturesLayerId)) {
      const mbLayer: MbLayer = {
        id: tooManyFeaturesLayerId,
        type: 'fill',
        source: sourceId,
        paint: {},
      };
      if (mvtSourceLayer) {
        mbLayer['source-layer'] = mvtSourceLayer;
      }
      mbMap.addLayer(mbLayer);
      mbMap.setFilter(tooManyFeaturesLayerId, [
        '==',
        ['get', KBN_TOO_MANY_FEATURES_PROPERTY],
        true,
      ]);
      mbMap.setPaintProperty(
        tooManyFeaturesLayerId,
        'fill-pattern',
        KBN_TOO_MANY_FEATURES_IMAGE_ID
      );
      mbMap.setPaintProperty(tooManyFeaturesLayerId, 'fill-opacity', this.getAlpha());
    }

    this.getCurrentStyle().setMBPaintProperties({
      alpha: this.getAlpha(),
      mbMap,
      fillLayerId,
      lineLayerId,
    });

    this.syncVisibilityWithMb(mbMap, fillLayerId);
    mbMap.setLayerZoomRange(fillLayerId, this.getMinZoom(), this.getMaxZoom());
    const fillFilterExpr = getFillFilterExpression(hasJoins);
    if (!_.isEqual(fillFilterExpr, mbMap.getFilter(fillLayerId))) {
      mbMap.setFilter(fillLayerId, fillFilterExpr);
    }

    this.syncVisibilityWithMb(mbMap, lineLayerId);
    mbMap.setLayerZoomRange(lineLayerId, this.getMinZoom(), this.getMaxZoom());
    const lineFilterExpr = getLineFilterExpression(hasJoins);
    if (!_.isEqual(lineFilterExpr, mbMap.getFilter(lineLayerId))) {
      mbMap.setFilter(lineLayerId, lineFilterExpr);
    }

    this.syncVisibilityWithMb(mbMap, tooManyFeaturesLayerId);
    mbMap.setLayerZoomRange(tooManyFeaturesLayerId, this.getMinZoom(), this.getMaxZoom());
  }

  _setMbCentroidProperties(mbMap: MbMap, mvtSourceLayer?: string) {
    const centroidLayerId = this._getMbCentroidLayerId();
    const centroidLayer = mbMap.getLayer(centroidLayerId);
    if (!centroidLayer) {
      const mbLayer: MbLayer = {
        id: centroidLayerId,
        type: 'symbol',
        source: this.getId(),
      };
      if (mvtSourceLayer) {
        mbLayer['source-layer'] = mvtSourceLayer;
      }
      mbMap.addLayer(mbLayer);
    }

    const filterExpr = getCentroidFilterExpression(this.hasJoins());
    if (!_.isEqual(filterExpr, mbMap.getFilter(centroidLayerId))) {
      mbMap.setFilter(centroidLayerId, filterExpr);
    }

    this.getCurrentStyle().setMBPropertiesForLabelText({
      alpha: this.getAlpha(),
      mbMap,
      textLayerId: centroidLayerId,
    });

    this.syncVisibilityWithMb(mbMap, centroidLayerId);
    mbMap.setLayerZoomRange(centroidLayerId, this.getMinZoom(), this.getMaxZoom());
  }

  _syncStylePropertiesWithMb(mbMap: MbMap) {
    this._setMbPointsProperties(mbMap);
    this._setMbLinePolygonProperties(mbMap);
    // centroid layers added after polygon layers to ensure they are on top of polygon layers
    this._setMbCentroidProperties(mbMap);
  }

  syncLayerWithMB(mbMap: MbMap) {
    addGeoJsonMbSource(this._getMbSourceId(), this.getMbLayerIds(), mbMap);
    this._syncFeatureCollectionWithMb(mbMap);
    this._syncStylePropertiesWithMb(mbMap);
  }

  _getMbPointLayerId() {
    return this.makeMbLayerId('circle');
  }

  _getMbTextLayerId() {
    return this.makeMbLayerId('text');
  }

  _getMbCentroidLayerId() {
    return this.makeMbLayerId('centroid');
  }

  _getMbSymbolLayerId() {
    return this.makeMbLayerId('symbol');
  }

  _getMbLineLayerId() {
    return this.makeMbLayerId('line');
  }

  _getMbPolygonLayerId() {
    return this.makeMbLayerId('fill');
  }

  _getMbTooManyFeaturesLayerId() {
    return this.makeMbLayerId('toomanyfeatures');
  }

  getMbLayerIds() {
    return [
      this._getMbPointLayerId(),
      this._getMbTextLayerId(),
      this._getMbCentroidLayerId(),
      this._getMbSymbolLayerId(),
      this._getMbLineLayerId(),
      this._getMbPolygonLayerId(),
      this._getMbTooManyFeaturesLayerId(),
    ];
  }

  ownsMbLayerId(mbLayerId: string) {
    return this.getMbLayerIds().includes(mbLayerId);
  }

  ownsMbSourceId(mbSourceId: string) {
    return this.getId() === mbSourceId;
  }

  _addJoinsToSourceTooltips(tooltipsFromSource: ITooltipProperty[]) {
    for (let i = 0; i < tooltipsFromSource.length; i++) {
      const tooltipProperty = tooltipsFromSource[i];
      const matchingJoins = [];
      for (let j = 0; j < this.getJoins().length; j++) {
        if (this.getJoins()[j].getLeftField().getName() === tooltipProperty.getPropertyKey()) {
          matchingJoins.push(this.getJoins()[j]);
        }
      }
      if (matchingJoins.length) {
        tooltipsFromSource[i] = new JoinTooltipProperty(tooltipProperty, matchingJoins);
      }
    }
  }

  async getPropertiesForTooltip(properties: GeoJsonProperties) {
    const vectorSource = this.getSource();
    let allProperties = await vectorSource.getTooltipProperties(properties);
    this._addJoinsToSourceTooltips(allProperties);

    for (let i = 0; i < this.getJoins().length; i++) {
      const propsFromJoin = await this.getJoins()[i].getTooltipProperties(properties);
      allProperties = [...allProperties, ...propsFromJoin];
    }
    return allProperties;
  }

  canShowTooltip() {
    return this.getSource().hasTooltipProperties() || this.getJoins().length > 0;
  }

  getFeatureById(id: string | number) {
    const featureCollection = this._getSourceFeatureCollection();
    if (!featureCollection) {
      return null;
    }

    const targetFeature = featureCollection.features.find((feature) => {
      return feature.properties?.[FEATURE_ID_PROPERTY_NAME] === id;
    });
    return targetFeature ? targetFeature : null;
  }

  async getLicensedFeatures() {
    return await this._source.getLicensedFeatures();
  }
}
