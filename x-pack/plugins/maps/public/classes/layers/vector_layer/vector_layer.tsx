/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { FilterSpecification, Map as MbMap, LayerSpecification } from '@kbn/mapbox-gl';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Query } from '@kbn/data-plugin/common';
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
import { TermJoinTooltipProperty } from '../../tooltips/term_join_tooltip_property';
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
import type { IJoinSource, ITermJoinSource } from '../../sources/join_sources';
import { isTermJoinSource } from '../../sources/join_sources';
import type { IESAggSource } from '../../sources/es_agg_source';
import { buildVectorRequestMeta } from '../build_vector_request_meta';
import { getJoinAggKey } from '../../../../common/get_agg_key';
import { syncBoundsData } from './bounds_data';
import { JoinState } from './types';
import { canSkipSourceUpdate } from '../../util/can_skip_fetch';
import { PropertiesMap } from '../../../../common/elasticsearch_util';
import { Mask } from './mask';

const SUPPORTS_FEATURE_EDITING_REQUEST_ID = 'SUPPORTS_FEATURE_EDITING_REQUEST_ID';

export function isVectorLayer(layer: ILayer) {
  return (layer as IVectorLayer).canShowTooltip !== undefined;
}

export interface VectorLayerArguments {
  source: IVectorSource;
  joins?: InnerJoin[];
  layerDescriptor: VectorLayerDescriptor;
  customIcons: CustomIcon[];
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
  getPropertiesForTooltip(
    properties: GeoJsonProperties,
    executionContext: KibanaExecutionContext
  ): Promise<ITooltipProperty[]>;
  hasJoins(): boolean;
  showJoinEditor(): boolean;
  canShowTooltip(): boolean;
  areTooltipsDisabled(): boolean;
  supportsFeatureEditing(): boolean;
  getLeftJoinFields(): Promise<IField[]>;
  addFeature(geometry: Geometry | Position[]): Promise<void>;
  deleteFeature(featureId: string): Promise<void>;
  getMasks(): Mask[];
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
  protected readonly _descriptor: VectorLayerDescriptor;
  private readonly _masks: Mask[];

  static createDescriptor(
    options: Partial<VectorLayerDescriptor>,
    mapColors?: string[]
  ): VectorLayerDescriptor {
    const layerDescriptor = super.createDescriptor(options) as VectorLayerDescriptor;
    layerDescriptor.type =
      layerDescriptor.type !== undefined ? layerDescriptor.type : LAYER_TYPE.GEOJSON_VECTOR;

    if (!options.style) {
      const styleProperties = VectorStyle.createDefaultStyleProperties(mapColors ? mapColors : []);
      layerDescriptor.style = VectorStyle.createDescriptor(styleProperties);
    }

    if (!options.joins) {
      layerDescriptor.joins = [];
    }

    layerDescriptor.disableTooltips = options.disableTooltips ?? false;

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
    this._descriptor = AbstractVectorLayer.createDescriptor(layerDescriptor);
    this._style = new VectorStyle(
      layerDescriptor.style,
      source,
      this,
      customIcons,
      chartsPaletteServiceGetColor
    );
    this._masks = this._createMasks();
  }

  async cloneDescriptor(): Promise<VectorLayerDescriptor[]> {
    const clones = await super.cloneDescriptor();
    if (clones.length === 0) {
      return [];
    }

    const clonedDescriptor = clones[0] as VectorLayerDescriptor;
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
        joinDescriptor.right.id = uuidv4();

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
    return [clonedDescriptor];
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

  isLayerLoading() {
    const isSourceLoading = super.isLayerLoading();
    if (isSourceLoading) {
      return true;
    }

    return this.getValidJoins().some((join) => {
      const joinDataRequest = this.getDataRequest(join.getSourceDataRequestId());
      return !joinDataRequest || joinDataRequest.isLoading();
    });
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

  async getBounds(getDataRequestContext: (layerId: string) => DataRequestContext) {
    return syncBoundsData({
      layerId: this.getId(),
      syncContext: getDataRequestContext(this.getId()),
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
    style: IVectorStyle,
    isFeatureEditorOpenForLayer: boolean
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
    return buildVectorRequestMeta(
      source,
      fieldNames,
      dataFilters,
      this.getQuery(),
      isForceRefresh,
      isFeatureEditorOpenForLayer
    );
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
    inspectorAdapters,
  }: {
    dataRequestId: string;
    dynamicStyleProps: Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
    source: IVectorSource | IJoinSource;
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
        inspectorAdapters,
        executionContext: dataFilters.executionContext,
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
    source: IVectorSource | IJoinSource;
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

  async _syncJoin({
    join,
    startLoading,
    stopLoading,
    onLoadError,
    registerCancelCallback,
    dataFilters,
    isForceRefresh,
    isFeatureEditorOpenForLayer,
    inspectorAdapters,
  }: { join: InnerJoin } & DataRequestContext): Promise<JoinState> {
    const joinSource = join.getRightJoinSource();
    const sourceDataId = join.getSourceDataRequestId();
    const requestToken = Symbol(`layer-join-refresh:${this.getId()} - ${sourceDataId}`);

    const joinRequestMeta = buildVectorRequestMeta(
      joinSource,
      joinSource.getFieldNames(),
      dataFilters,
      joinSource.getWhereQuery(),
      isForceRefresh,
      isFeatureEditorOpenForLayer
    );

    const prevDataRequest = this.getDataRequest(sourceDataId);
    const canSkipFetch = await canSkipSourceUpdate({
      source: joinSource,
      prevDataRequest,
      nextRequestMeta: joinRequestMeta,
      extentAware: false, // join-sources are term-aggs that are spatially unaware (e.g. ESTermSource/TableSource).
      getUpdateDueToTimeslice: () => {
        return true;
      },
    });

    if (canSkipFetch) {
      return {
        dataHasChanged: false,
        join,
        propertiesMap: prevDataRequest?.getData() as PropertiesMap,
      };
    }

    try {
      startLoading(sourceDataId, requestToken, joinRequestMeta);
      const leftSourceName = await this._source.getDisplayName();
      const propertiesMap = await joinSource.getPropertiesMap(
        joinRequestMeta,
        leftSourceName,
        join.getLeftField().getName(),
        registerCancelCallback.bind(null, requestToken),
        inspectorAdapters
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

  _getJoinFilterExpression(): FilterSpecification | undefined {
    return undefined;
  }

  _createMasks() {
    const masks: Mask[] = [];
    const source = this.getSource();
    if ('getMetricFields' in (source as IESAggSource)) {
      const metricFields = (source as IESAggSource).getMetricFields();
      metricFields.forEach((metricField) => {
        const maskDescriptor = metricField.getMask();
        if (maskDescriptor) {
          masks.push(
            new Mask({
              esAggField: metricField,
              isGeometrySourceMvt: source.isMvt(),
              ...maskDescriptor,
            })
          );
        }
      });
    }

    this.getValidJoins().forEach((join) => {
      const rightSource = join.getRightJoinSource();
      if ('getMetricFields' in (rightSource as unknown as IESAggSource)) {
        const metricFields = (rightSource as unknown as IESAggSource).getMetricFields();
        metricFields.forEach((metricField) => {
          const maskDescriptor = metricField.getMask();
          if (maskDescriptor) {
            masks.push(
              new Mask({
                esAggField: metricField,
                isGeometrySourceMvt: source.isMvt(),
                ...maskDescriptor,
              })
            );
          }
        });
      }
    });

    return masks;
  }

  getMasks() {
    return this._masks;
  }

  // feature-state is not supported in filter expressions
  // https://github.com/mapbox/mapbox-gl-js/issues/8487
  // therefore, masking must be accomplished via setting opacity paint property (hack)
  _getAlphaExpression() {
    const maskCaseExpressions: unknown[] = [];
    this.getMasks().forEach((mask) => {
      // case expressions require 2 parts
      // 1) condition expression
      maskCaseExpressions.push(mask.getMatchMaskedExpression());
      // 2) output. 0 opacity styling "hides" feature
      maskCaseExpressions.push(0);
    });

    return maskCaseExpressions.length
      ? ['case', ...maskCaseExpressions, this.getAlpha()]
      : this.getAlpha();
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
        const mbLayer: LayerSpecification = {
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
        const mbLayer: LayerSpecification = {
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

    const isSourceGeoJson = !this.getSource().isMvt();
    const filterExpr = getPointFilterExpression(
      isSourceGeoJson,
      this.getSource().isESSource(),
      this._getJoinFilterExpression(),
      timesliceMaskConfig
    );
    if (!_.isEqual(filterExpr, mbMap.getFilter(markerLayerId))) {
      mbMap.setFilter(markerLayerId, filterExpr);
    }

    if (this.getCurrentStyle().arePointsSymbolizedAsCircles()) {
      this.getCurrentStyle().setMBPaintPropertiesForPoints({
        alpha: this._getAlphaExpression(),
        mbMap,
        pointLayerId: markerLayerId,
      });
    } else {
      this.getCurrentStyle().setMBSymbolPropertiesForPoints({
        alpha: this._getAlphaExpression(),
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

    if (!mbMap.getLayer(fillLayerId)) {
      const mbLayer: LayerSpecification = {
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
      const mbLayer: LayerSpecification = {
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
      alpha: this._getAlphaExpression(),
      mbMap,
      fillLayerId,
      lineLayerId,
    });

    const joinFilter = this._getJoinFilterExpression();

    this.syncVisibilityWithMb(mbMap, fillLayerId);
    mbMap.setLayerZoomRange(fillLayerId, this.getMinZoom(), this.getMaxZoom());
    const fillFilterExpr = getFillFilterExpression(joinFilter, timesliceMaskConfig);
    if (!_.isEqual(fillFilterExpr, mbMap.getFilter(fillLayerId))) {
      mbMap.setFilter(fillLayerId, fillFilterExpr);
    }

    this.syncVisibilityWithMb(mbMap, lineLayerId);
    mbMap.setLayerZoomRange(lineLayerId, this.getMinZoom(), this.getMaxZoom());
    const lineFilterExpr = getLineFilterExpression(joinFilter, timesliceMaskConfig);
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
      const mbLayer: LayerSpecification = {
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
      isSourceGeoJson,
      this.getSource().isESSource(),
      this._getJoinFilterExpression(),
      timesliceMaskConfig
    );
    if (!_.isEqual(filterExpr, mbMap.getFilter(labelLayerId))) {
      mbMap.setFilter(labelLayerId, filterExpr);
    }

    this.getCurrentStyle().setMBPropertiesForLabelText({
      alpha: this._getAlphaExpression(),
      mbMap,
      textLayerId: labelLayerId,
    });

    this.syncVisibilityWithMb(mbMap, labelLayerId);
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

  /*
   * Replaces source property tooltips with join property tooltips
   * join property tooltips allow tooltips to
   *  1) Create filter from right source context
   *  2) Display tooltip with right source context
   */
  _addJoinsToSourceTooltips(tooltipsFromSource: ITooltipProperty[]) {
    for (let i = 0; i < tooltipsFromSource.length; i++) {
      const tooltipProperty = tooltipsFromSource[i];
      const matchingTermJoins: ITermJoinSource[] = [];
      for (let j = 0; j < this.getJoins().length; j++) {
        const join = this.getJoins()[j];
        const joinRightSource = join.getRightJoinSource();
        if (
          isTermJoinSource(joinRightSource) &&
          this.getJoins()[j].getLeftField().getName() === tooltipProperty.getPropertyKey()
        ) {
          matchingTermJoins.push(joinRightSource as ITermJoinSource);
        }
      }
      if (matchingTermJoins.length) {
        tooltipsFromSource[i] = new TermJoinTooltipProperty(tooltipProperty, matchingTermJoins);
      }
    }
  }

  async getPropertiesForTooltip(
    properties: GeoJsonProperties,
    executionContext: KibanaExecutionContext
  ) {
    const vectorSource = this.getSource();
    let allProperties = await vectorSource.getTooltipProperties(properties, executionContext);
    this._addJoinsToSourceTooltips(allProperties);

    for (let i = 0; i < this.getJoins().length; i++) {
      const propsFromJoin = await this.getJoins()[i].getTooltipProperties(
        properties,
        executionContext
      );
      allProperties = [...allProperties, ...propsFromJoin];
    }
    return allProperties;
  }

  /**
   * Check if there are any properties we can display in a tooltip. If `false` the "Show tooltips" switch
   * is disabled in Layer settings.
   * @returns {boolean}
   */
  canShowTooltip() {
    return this.getSource().hasTooltipProperties() || this.getJoins().length > 0;
  }

  /**
   * Users can toggle tooltips on hover or click in the Layer settings. Tooltips are enabled by default.
   * @returns {boolean}
   */
  areTooltipsDisabled(): boolean {
    return this._descriptor.disableTooltips ?? false;
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
