/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import uuid from 'uuid/v4';
import type { Map as MbMap, AnyLayer as MbLayer } from '@kbn/mapbox-gl';
import type { Query } from 'src/plugins/data/common';
import { Feature, GeoJsonProperties, Geometry, Position } from 'geojson';
import _ from 'lodash';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AbstractLayer } from '../layer';
import { IVectorStyle, VectorStyle } from '../../styles/vector/vector_style';
import {
  AGG_TYPE,
  SOURCE_META_DATA_REQUEST_ID,
  SOURCE_FORMATTERS_DATA_REQUEST_ID,
  LAYER_TYPE,
  FIELD_ORIGIN,
  FieldFormatter,
  SOURCE_TYPES,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { JoinTooltipProperty } from '../../tooltips/join_tooltip_property';
import { DataRequestAbortError } from '../../util/data_request';
import { canSkipStyleMetaUpdate, canSkipFormattersUpdate } from '../../util/can_skip_fetch';
import {
  getLabelFilterExpression,
  getFillFilterExpression,
  getLineFilterExpression,
  getPointFilterExpression,
  TimesliceMaskConfig,
} from '../../util/mb_filter_expressions';
import {
  AggDescriptor,
  CustomIcon,
  DynamicStylePropertyOptions,
  DataFilters,
  ESTermSourceDescriptor,
  JoinDescriptor,
  StyleMetaDescriptor,
  VectorLayerDescriptor,
  VectorSourceRequestMeta,
  VectorStyleRequestMeta,
} from '../../../../common/descriptor_types';
import { IVectorSource } from '../../sources/vector_source';
import { LayerIcon, ILayer } from '../layer';
import { InnerJoin } from '../../joins/inner_join';
import { IField } from '../../fields/field';
import { DataRequestContext } from '../../../actions';
import { ITooltipProperty } from '../../tooltips/tooltip_property';
import { IDynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import { IESSource } from '../../sources/es_source';
import { ITermJoinSource } from '../../sources/term_join_source';
import { buildVectorRequestMeta } from '../build_vector_request_meta';
import { getJoinAggKey } from '../../../../common/get_agg_key';
import { syncBoundsData } from './bounds_data';

const SUPPORTS_FEATURE_EDITING_REQUEST_ID = 'SUPPORTS_FEATURE_EDITING_REQUEST_ID';

export function isVectorLayer(layer: ILayer) {
  return (layer as IVectorLayer).canShowTooltip !== undefined;
}

export interface VectorLayerArguments {
  source: IVectorSource;
  joins?: InnerJoin[];
  layerDescriptor: VectorLayerDescriptor;
  customIcons?: CustomIcon[];
  chartsPaletteServiceGetColor?: (value: string) => string | null;
}

export interface IVectorLayer extends ILayer {
  /*
   * IVectorLayer.getMbLayerIds returns a list of mapbox layers assoicated with this layer for identifing features with tooltips.
   * Must return ILayer.getMbLayerIds or a subset of ILayer.getMbLayerIds.
   */
  getMbTooltipLayerIds(): string[];

  getFields(): Promise<IField[]>;
  getStyleEditorFields(): Promise<IField[]>;
  getJoins(): InnerJoin[];
  getJoinsDisabledReason(): string | null;
  getValidJoins(): InnerJoin[];
  getSource(): IVectorSource;
  getFeatureId(feature: Feature): string | number | undefined;
  getFeatureById(id: string | number): Feature | null;
  getPropertiesForTooltip(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
  hasJoins(): boolean;
  showJoinEditor(): boolean;
  canShowTooltip(): boolean;
  supportsFeatureEditing(): boolean;
  getLeftJoinFields(): Promise<IField[]>;
  addFeature(geometry: Geometry | Position[]): Promise<void>;
  deleteFeature(featureId: string): Promise<void>;
}

export const noResultsIcon = <EuiIcon size="m" color="subdued" type="minusInCircle" />;
export const NO_RESULTS_ICON_AND_TOOLTIPCONTENT = {
  icon: noResultsIcon,
  tooltipContent: i18n.translate('xpack.maps.vectorLayer.noResultsFoundTooltip', {
    defaultMessage: `No results found.`,
  }),
};

export class AbstractVectorLayer extends AbstractLayer implements IVectorLayer {
  protected readonly _style: VectorStyle;
  private readonly _joins: InnerJoin[];

  static createDescriptor(
    options: Partial<VectorLayerDescriptor>,
    mapColors?: string[]
  ): VectorLayerDescriptor {
    const layerDescriptor = super.createDescriptor(options) as VectorLayerDescriptor;
    layerDescriptor.type = LAYER_TYPE.GEOJSON_VECTOR;

    if (!options.style) {
      const styleProperties = VectorStyle.createDefaultStyleProperties(mapColors ? mapColors : []);
      layerDescriptor.style = VectorStyle.createDescriptor(styleProperties);
    }

    if (!options.joins) {
      layerDescriptor.joins = [];
    }

    return layerDescriptor;
  }

  constructor({
    layerDescriptor,
    source,
    joins = [],
    customIcons,
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
      customIcons,
      chartsPaletteServiceGetColor
    );
  }

  async cloneDescriptor(): Promise<VectorLayerDescriptor> {
    const clonedDescriptor = (await super.cloneDescriptor()) as VectorLayerDescriptor;
    if (clonedDescriptor.joins) {
      clonedDescriptor.joins.forEach((joinDescriptor: JoinDescriptor) => {
        if (joinDescriptor.right && joinDescriptor.right.type === SOURCE_TYPES.TABLE_SOURCE) {
          throw new Error(
            'Cannot clone table-source. Should only be used in MapEmbeddable, not in UX'
          );
        }
        const termSourceDescriptor: ESTermSourceDescriptor =
          joinDescriptor.right as ESTermSourceDescriptor;

        // todo: must tie this to generic thing
        const originalJoinId = joinDescriptor.right.id!;

        // right.id is uuid used to track requests in inspector
        joinDescriptor.right.id = uuid();

        // Update all data driven styling properties using join fields
        if (clonedDescriptor.style && 'properties' in clonedDescriptor.style) {
          const metrics =
            termSourceDescriptor.metrics && termSourceDescriptor.metrics.length
              ? termSourceDescriptor.metrics
              : [{ type: AGG_TYPE.COUNT }];
          metrics.forEach((metricsDescriptor: AggDescriptor) => {
            const originalJoinKey = getJoinAggKey({
              aggType: metricsDescriptor.type,
              aggFieldName: 'field' in metricsDescriptor ? metricsDescriptor.field : '',
              rightSourceId: originalJoinId,
            });
            const newJoinKey = getJoinAggKey({
              aggType: metricsDescriptor.type,
              aggFieldName: 'field' in metricsDescriptor ? metricsDescriptor.field : '',
              rightSourceId: joinDescriptor.right.id!,
            });

            Object.keys(clonedDescriptor.style.properties).forEach((key) => {
              const styleProp = clonedDescriptor.style.properties[key as VECTOR_STYLES];
              if ('type' in styleProp && styleProp.type === STYLE_TYPE.DYNAMIC) {
                const options = styleProp.options as DynamicStylePropertyOptions;
                if (
                  options.field &&
                  options.field.origin === FIELD_ORIGIN.JOIN &&
                  options.field.name === originalJoinKey
                ) {
                  options.field.name = newJoinKey;
                }
              }
            });
          });
        }
      });
    }
    return clonedDescriptor;
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

  getCurrentStyle(): VectorStyle {
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

  getJoinsDisabledReason() {
    return this.getSource().getJoinsDisabledReason();
  }

  getValidJoins() {
    return this.getJoins().filter((join) => {
      return join.hasCompleteConfig();
    });
  }

  supportsFeatureEditing(): boolean {
    const dataRequest = this.getDataRequest(SUPPORTS_FEATURE_EDITING_REQUEST_ID);
    const data = dataRequest?.getData() as { supportsFeatureEditing: boolean } | undefined;
    return data ? data.supportsFeatureEditing : false;
  }

  hasJoins() {
    return this.getValidJoins().length > 0;
  }

  showJoinEditor(): boolean {
    return this.getSource().showJoinEditor();
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

  getLayerIcon(isTocIcon: boolean): LayerIcon {
    throw new Error('Should implement AbstractVectorLayer#getLayerIcon');
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
    return syncBoundsData({
      layerId: this.getId(),
      syncContext,
      source: this.getSource(),
      sourceQuery: this.getQuery(),
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

  async _getVectorSourceRequestMeta(
    isForceRefresh: boolean,
    dataFilters: DataFilters,
    source: IVectorSource,
    style: IVectorStyle
  ): Promise<VectorSourceRequestMeta> {
    const fieldNames = [
      ...source.getFieldNames(),
      ...style.getSourceFieldNames(),
      ...this.getValidJoins().map((join) => join.getLeftField().getName()),
    ];

    const timesliceMaskFieldName = await source.getTimesliceMaskFieldName();
    if (timesliceMaskFieldName) {
      fieldNames.push(timesliceMaskFieldName);
    }
    return buildVectorRequestMeta(source, fieldNames, dataFilters, this.getQuery(), isForceRefresh);
  }

  async _syncSourceStyleMeta(
    syncContext: DataRequestContext,
    source: IVectorSource,
    style: IVectorStyle
  ) {
    const sourceQuery = this.getQuery();
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
    sourceQuery?: Query;
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

  async _syncSupportsFeatureEditing({
    syncContext,
    source,
  }: {
    syncContext: DataRequestContext;
    source: IVectorSource;
  }) {
    if (syncContext.dataFilters.isReadOnly) {
      return;
    }
    const { startLoading, stopLoading, onLoadError } = syncContext;
    const dataRequestId = SUPPORTS_FEATURE_EDITING_REQUEST_ID;
    const requestToken = Symbol(`layer-${this.getId()}-${dataRequestId}`);
    const prevDataRequest = this.getDataRequest(dataRequestId);
    if (prevDataRequest) {
      return;
    }
    try {
      startLoading(dataRequestId, requestToken);
      const supportsFeatureEditing = await source.supportsFeatureEditing();
      stopLoading(dataRequestId, requestToken, { supportsFeatureEditing });
    } catch (error) {
      onLoadError(dataRequestId, requestToken, error.message);
      throw error;
    }
  }

  _setMbPointsProperties(
    mbMap: MbMap,
    mvtSourceLayer?: string,
    timesliceMaskConfig?: TimesliceMaskConfig
  ) {
    const sourceId = this.getId();
    const labelLayerId = this._getMbLabelLayerId();
    const pointLayerId = this._getMbPointLayerId();
    const symbolLayerId = this._getMbSymbolLayerId();
    const pointLayer = mbMap.getLayer(pointLayerId);
    const symbolLayer = mbMap.getLayer(symbolLayerId);

    //
    // Create marker layer
    // "circle" layer type for points
    // "symbol" layer type for icons
    //
    let markerLayerId;
    if (this.getCurrentStyle().arePointsSymbolizedAsCircles()) {
      markerLayerId = pointLayerId;
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
        mbMap.addLayer(mbLayer, labelLayerId);
      }
      if (symbolLayer) {
        mbMap.setLayoutProperty(symbolLayerId, 'visibility', 'none');
      }
    } else {
      markerLayerId = symbolLayerId;
      if (!symbolLayer) {
        const mbLayer: MbLayer = {
          id: symbolLayerId,
          type: 'symbol',
          source: sourceId,
        };
        if (mvtSourceLayer) {
          mbLayer['source-layer'] = mvtSourceLayer;
        }
        mbMap.addLayer(mbLayer, labelLayerId);
      }
      if (pointLayer) {
        mbMap.setLayoutProperty(pointLayerId, 'visibility', 'none');
      }
    }

    const filterExpr = getPointFilterExpression(this.hasJoins(), timesliceMaskConfig);
    if (!_.isEqual(filterExpr, mbMap.getFilter(markerLayerId))) {
      mbMap.setFilter(markerLayerId, filterExpr);
    }

    if (this.getCurrentStyle().arePointsSymbolizedAsCircles()) {
      this.getCurrentStyle().setMBPaintPropertiesForPoints({
        alpha: this.getAlpha(),
        mbMap,
        pointLayerId: markerLayerId,
      });
    } else {
      this.getCurrentStyle().setMBSymbolPropertiesForPoints({
        alpha: this.getAlpha(),
        mbMap,
        symbolLayerId: markerLayerId,
      });
    }

    this.syncVisibilityWithMb(mbMap, markerLayerId);
    mbMap.setLayerZoomRange(markerLayerId, this.getMinZoom(), this.getMaxZoom());
  }

  _setMbLinePolygonProperties(
    mbMap: MbMap,
    mvtSourceLayer?: string,
    timesliceMaskConfig?: TimesliceMaskConfig
  ) {
    const sourceId = this.getId();
    const labelLayerId = this._getMbLabelLayerId();
    const fillLayerId = this._getMbPolygonLayerId();
    const lineLayerId = this._getMbLineLayerId();

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
      mbMap.addLayer(mbLayer, labelLayerId);
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
      mbMap.addLayer(mbLayer, labelLayerId);
    }

    this.getCurrentStyle().setMBPaintProperties({
      alpha: this.getAlpha(),
      mbMap,
      fillLayerId,
      lineLayerId,
    });

    this.syncVisibilityWithMb(mbMap, fillLayerId);
    mbMap.setLayerZoomRange(fillLayerId, this.getMinZoom(), this.getMaxZoom());
    const fillFilterExpr = getFillFilterExpression(hasJoins, timesliceMaskConfig);
    if (!_.isEqual(fillFilterExpr, mbMap.getFilter(fillLayerId))) {
      mbMap.setFilter(fillLayerId, fillFilterExpr);
    }

    this.syncVisibilityWithMb(mbMap, lineLayerId);
    mbMap.setLayerZoomRange(lineLayerId, this.getMinZoom(), this.getMaxZoom());
    const lineFilterExpr = getLineFilterExpression(hasJoins, timesliceMaskConfig);
    if (!_.isEqual(lineFilterExpr, mbMap.getFilter(lineLayerId))) {
      mbMap.setFilter(lineLayerId, lineFilterExpr);
    }
  }

  _setMbLabelProperties(
    mbMap: MbMap,
    mvtSourceLayer?: string,
    timesliceMaskConfig?: TimesliceMaskConfig
  ) {
    const labelLayerId = this._getMbLabelLayerId();
    const labelLayer = mbMap.getLayer(labelLayerId);
    if (!labelLayer) {
      const mbLayer: MbLayer = {
        id: labelLayerId,
        type: 'symbol',
        source: this.getId(),
      };
      if (mvtSourceLayer) {
        mbLayer['source-layer'] = mvtSourceLayer;
      }
      mbMap.addLayer(mbLayer);
    }

    const isSourceGeoJson = !this.getSource().isMvt();
    const filterExpr = getLabelFilterExpression(
      this.hasJoins(),
      isSourceGeoJson,
      timesliceMaskConfig
    );
    if (!_.isEqual(filterExpr, mbMap.getFilter(labelLayerId))) {
      mbMap.setFilter(labelLayerId, filterExpr);
    }

    this.getCurrentStyle().setMBPropertiesForLabelText({
      alpha: this.getAlpha(),
      mbMap,
      textLayerId: labelLayerId,
    });

    this.syncVisibilityWithMb(mbMap, labelLayerId);
    mbMap.setLayerZoomRange(labelLayerId, this.getMinZoom(), this.getMaxZoom());
  }

  _getMbPointLayerId() {
    return this.makeMbLayerId('circle');
  }

  _getMbLabelLayerId() {
    return this.makeMbLayerId('label');
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

  getMbTooltipLayerIds() {
    return [
      this._getMbPointLayerId(),
      this._getMbLabelLayerId(),
      this._getMbSymbolLayerId(),
      this._getMbLineLayerId(),
      this._getMbPolygonLayerId(),
    ];
  }

  getMbLayerIds() {
    return this.getMbTooltipLayerIds();
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

  getFeatureId(feature: Feature): string | number | undefined {
    throw new Error('Should implement AbstractVectorLayer#getFeatureId');
  }

  getFeatureById(id: string | number): Feature | null {
    throw new Error('Should implement AbstractVectorLayer#getFeatureById');
  }

  async getLicensedFeatures() {
    return await this._source.getLicensedFeatures();
  }

  async addFeature(geometry: Geometry | Position[]) {
    const layerSource = this.getSource();
    const defaultFields = await layerSource.getDefaultFields();
    await layerSource.addFeature(geometry, defaultFields);
  }

  async deleteFeature(featureId: string) {
    const layerSource = this.getSource();
    await layerSource.deleteFeature(featureId);
  }

  async getStyleMetaDescriptorFromLocalFeatures(): Promise<StyleMetaDescriptor | null> {
    throw new Error('Should implement AbstractVectorLayer#getStyleMetaDescriptorFromLocalFeatures');
  }
}
