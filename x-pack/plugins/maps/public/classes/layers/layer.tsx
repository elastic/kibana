/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { Query } from '@kbn/data-plugin/public';
import _ from 'lodash';
import React, { ReactElement } from 'react';
import { EuiIcon } from '@elastic/eui';
import uuid from 'uuid/v4';
import { FeatureCollection } from 'geojson';
import { DataRequest } from '../util/data_request';
import {
  LAYER_TYPE,
  MAX_ZOOM,
  MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER,
  MIN_ZOOM,
  SOURCE_BOUNDS_DATA_REQUEST_ID,
  SOURCE_DATA_REQUEST_ID,
} from '../../../common/constants';
import { copyPersistentState } from '../../reducers/copy_persistent_state';
import {
  Attribution,
  CustomIcon,
  LayerDescriptor,
  MapExtent,
  StyleDescriptor,
  TileMetaFeature,
  Timeslice,
  StyleMetaDescriptor,
} from '../../../common/descriptor_types';
import { ImmutableSourceProperty, ISource, SourceEditorArgs } from '../sources/source';
import { DataRequestContext } from '../../actions';
import { IStyle } from '../styles/style';
import { LICENSED_FEATURES } from '../../licensed_features';
import { IESSource } from '../sources/es_source';

export interface ILayer {
  getBounds(dataRequestContext: DataRequestContext): Promise<MapExtent | null>;
  getDataRequest(id: string): DataRequest | undefined;
  getDisplayName(source?: ISource): Promise<string>;
  getId(): string;
  getSourceDataRequest(): DataRequest | undefined;
  getSource(): ISource;
  getSourceForEditing(): ISource;
  syncData(syncContext: DataRequestContext): void;
  supportsElasticsearchFilters(): boolean;
  supportsFitToBounds(): Promise<boolean>;
  getAttributions(): Promise<Attribution[]>;
  getLabel(): string;
  hasLegendDetails(): Promise<boolean>;
  renderLegendDetails(): ReactElement<any> | null;
  showAtZoomLevel(zoom: number): boolean;
  getMinZoom(): number;
  getMaxZoom(): number;
  getMinSourceZoom(): number;
  getAlpha(): number;
  getQuery(): Query | null;
  getStyle(): IStyle;
  getStyleForEditing(): IStyle;
  getCurrentStyle(): IStyle;
  getImmutableSourceProperties(): Promise<ImmutableSourceProperty[]>;
  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null;
  isLayerLoading(): boolean;
  isLoadingBounds(): boolean;
  isFilteredByGlobalTime(): Promise<boolean>;
  hasErrors(): boolean;
  getErrors(): string;

  /*
   * ILayer.getMbLayerIds returns a list of all mapbox layers assoicated with this layer.
   */
  getMbLayerIds(): string[];

  /*
   * ILayer.getMbSourceId returns mapbox source id assoicated with this layer.
   */
  getMbSourceId(): string;

  ownsMbLayerId(mbLayerId: string): boolean;
  ownsMbSourceId(mbSourceId: string): boolean;
  syncLayerWithMB(mbMap: MbMap, timeslice?: Timeslice): void;
  getLayerTypeIconName(): string;
  isInitialDataLoadComplete(): boolean;
  getIndexPatternIds(): string[];
  getQueryableIndexPatternIds(): string[];
  getType(): LAYER_TYPE;
  isVisible(): boolean;
  cloneDescriptor(): Promise<LayerDescriptor>;
  renderStyleEditor(
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void,
    onCustomIconsChange: (customIcons: CustomIcon[]) => void
  ): ReactElement<any> | null;
  getInFlightRequestTokens(): symbol[];
  getPrevRequestToken(dataId: string): symbol | undefined;
  destroy: () => void;
  isPreviewLayer: () => boolean;
  areLabelsOnTop: () => boolean;
  supportsLabelsOnTop: () => boolean;
  isFittable(): Promise<boolean>;
  isIncludeInFitToBounds(): boolean;
  getLicensedFeatures(): Promise<LICENSED_FEATURES[]>;

  /*
   * ILayer.getLayerIcon returns layer icon and associated state.
   * isTocIcon is set to true when icon is generated for Table of Contents.
   * Icons in Table of Contents may contain additional layer status, for example, indicate when a layer has incomplete results.
   */
  getLayerIcon(isTocIcon: boolean): LayerIcon;
  getDescriptor(): LayerDescriptor;
  getGeoFieldNames(): string[];
  getStyleMetaDescriptorFromLocalFeatures(): Promise<StyleMetaDescriptor | null>;
  isBasemap(order: number): boolean;
}

export type LayerIcon = {
  icon: ReactElement;
  tooltipContent?: string | null;
  areResultsTrimmed?: boolean;
};

export interface ILayerArguments {
  layerDescriptor: LayerDescriptor;
  source: ISource;
}

export class AbstractLayer implements ILayer {
  protected readonly _descriptor: LayerDescriptor;
  protected readonly _source: ISource;
  protected readonly _dataRequests: DataRequest[];

  static createDescriptor(options: Partial<LayerDescriptor>): LayerDescriptor {
    return {
      ...options,
      sourceDescriptor: options.sourceDescriptor ? options.sourceDescriptor : null,
      __dataRequests: _.get(options, '__dataRequests', []),
      id: _.get(options, 'id', uuid()),
      label: options.label && options.label.length > 0 ? options.label : null,
      minZoom: _.get(options, 'minZoom', MIN_ZOOM),
      maxZoom: _.get(options, 'maxZoom', MAX_ZOOM),
      alpha: _.get(options, 'alpha', 0.75),
      visible: _.get(options, 'visible', true),
      style: _.get(options, 'style', null),
      includeInFitToBounds:
        typeof options.includeInFitToBounds === 'boolean' ? options.includeInFitToBounds : true,
    };
  }

  destroy() {
    if (this._source) {
      this._source.destroy();
    }
  }

  constructor({ layerDescriptor, source }: ILayerArguments) {
    this._descriptor = AbstractLayer.createDescriptor(layerDescriptor);
    this._source = source;
    if (this._descriptor.__dataRequests) {
      this._dataRequests = this._descriptor.__dataRequests.map(
        (dataRequest) => new DataRequest(dataRequest)
      );
    } else {
      this._dataRequests = [];
    }
  }

  static getBoundDataForSource(mbMap: unknown, sourceId: string): FeatureCollection {
    // @ts-expect-error
    const mbStyle = mbMap.getStyle();
    return mbStyle.sources[sourceId].data;
  }

  getDescriptor(): LayerDescriptor {
    return this._descriptor;
  }

  async cloneDescriptor(): Promise<LayerDescriptor> {
    const clonedDescriptor = copyPersistentState(this._descriptor);
    // layer id is uuid used to track styles/layers in mapbox
    clonedDescriptor.id = uuid();
    const displayName = await this.getDisplayName();
    clonedDescriptor.label = `Clone of ${displayName}`;
    clonedDescriptor.sourceDescriptor = this.getSource().cloneDescriptor();
    return clonedDescriptor;
  }

  makeMbLayerId(layerNameSuffix: string): string {
    return `${this.getId()}${MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER}${layerNameSuffix}`;
  }

  isPreviewLayer(): boolean {
    return !!this._descriptor.__isPreviewLayer;
  }

  supportsElasticsearchFilters(): boolean {
    return this.getSource().isESSource();
  }

  async supportsFitToBounds(): Promise<boolean> {
    return await this.getSource().supportsFitToBounds();
  }

  async isFittable(): Promise<boolean> {
    return (await this.supportsFitToBounds()) && this.isVisible() && this.isIncludeInFitToBounds();
  }

  isIncludeInFitToBounds(): boolean {
    return !!this._descriptor.includeInFitToBounds;
  }

  async isFilteredByGlobalTime(): Promise<boolean> {
    return false;
  }

  async getDisplayName(source?: ISource): Promise<string> {
    if (this._descriptor.label) {
      return this._descriptor.label;
    }

    const sourceDisplayName = source
      ? await source.getDisplayName()
      : await this.getSource().getDisplayName();
    return sourceDisplayName || `Layer ${this._descriptor.id}`;
  }

  async getAttributions(): Promise<Attribution[]> {
    if (this.hasErrors() || !this.isVisible()) {
      return [];
    }

    const attributionProvider = this.getSource().getAttributionProvider();
    if (attributionProvider) {
      return attributionProvider();
    }

    return this._descriptor.attribution !== undefined ? [this._descriptor.attribution] : [];
  }

  getStyleForEditing(): IStyle {
    throw new Error('Should implement AbstractLayer#getStyleForEditing');
  }

  getStyle(): IStyle {
    throw new Error('Should implement AbstractLayer#getStyle');
  }

  getCurrentStyle(): IStyle {
    throw new Error('Should implement AbstractLayer#getCurrentStyle');
  }

  getLabel(): string {
    return this._descriptor.label ? this._descriptor.label : '';
  }

  getLayerIcon(isTocIcon: boolean): LayerIcon {
    return {
      icon: <EuiIcon size="m" type={this.getLayerTypeIconName()} />,
    };
  }

  async hasLegendDetails(): Promise<boolean> {
    return false;
  }

  renderLegendDetails(): ReactElement<any> | null {
    return null;
  }

  getId(): string {
    return this._descriptor.id;
  }

  getSource(): ISource {
    return this._source;
  }

  getSourceForEditing(): ISource {
    return this._source;
  }

  isVisible(): boolean {
    return !!this._descriptor.visible;
  }

  showAtZoomLevel(zoom: number): boolean {
    return zoom >= this.getMinZoom() && zoom <= this.getMaxZoom();
  }

  getMinZoom(): number {
    return typeof this._descriptor.minZoom === 'number' ? this._descriptor.minZoom : MIN_ZOOM;
  }

  getMaxZoom(): number {
    return typeof this._descriptor.maxZoom === 'number' ? this._descriptor.maxZoom : MAX_ZOOM;
  }

  getMinSourceZoom(): number {
    return this._source.getMinZoom();
  }

  getMbSourceId() {
    return this.getId();
  }

  _requiresPrevSourceCleanup(mbMap: unknown) {
    return false;
  }

  _removeStaleMbSourcesAndLayers(mbMap: unknown) {
    if (this._requiresPrevSourceCleanup(mbMap)) {
      // @ts-expect-error
      const mbStyle = mbMap.getStyle();
      // @ts-expect-error
      mbStyle.layers.forEach((mbLayer) => {
        if (this.ownsMbLayerId(mbLayer.id)) {
          // @ts-expect-error
          mbMap.removeLayer(mbLayer.id);
        }
      });
      Object.keys(mbStyle.sources).some((mbSourceId) => {
        if (this.ownsMbSourceId(mbSourceId)) {
          // @ts-expect-error
          mbMap.removeSource(mbSourceId);
        }
      });
    }
  }

  getAlpha(): number {
    return typeof this._descriptor.alpha === 'number' ? this._descriptor.alpha : 1;
  }

  getQuery(): Query | null {
    return this._descriptor.query ? this._descriptor.query : null;
  }

  async getImmutableSourceProperties(): Promise<ImmutableSourceProperty[]> {
    const source = this.getSource();
    return await source.getImmutableProperties();
  }

  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs) {
    return this.getSourceForEditing().renderSourceSettingsEditor(sourceEditorArgs);
  }

  getPrevRequestToken(dataId: string): symbol | undefined {
    const prevDataRequest = this.getDataRequest(dataId);
    if (!prevDataRequest) {
      return;
    }

    return prevDataRequest.getRequestToken();
  }

  getInFlightRequestTokens(): symbol[] {
    if (!this._dataRequests) {
      return [];
    }

    const requestTokens = this._dataRequests.map((dataRequest) => dataRequest.getRequestToken());

    // Compact removes all the undefineds
    return _.compact(requestTokens);
  }

  getSourceDataRequest(): DataRequest | undefined {
    return this.getDataRequest(SOURCE_DATA_REQUEST_ID);
  }

  getDataRequest(id: string): DataRequest | undefined {
    return this._dataRequests.find((dataRequest) => dataRequest.getDataId() === id);
  }

  isLayerLoading(): boolean {
    const areTilesLoading =
      typeof this._descriptor.__areTilesLoaded !== 'undefined'
        ? !this._descriptor.__areTilesLoaded
        : false;
    return areTilesLoading || this._dataRequests.some((dataRequest) => dataRequest.isLoading());
  }

  isLoadingBounds() {
    const boundsDataRequest = this.getDataRequest(SOURCE_BOUNDS_DATA_REQUEST_ID);
    return !!boundsDataRequest && boundsDataRequest.isLoading();
  }

  hasErrors(): boolean {
    return _.get(this._descriptor, '__isInErrorState', false);
  }

  getErrors(): string {
    return this.hasErrors() && this._descriptor.__errorMessage
      ? this._descriptor.__errorMessage
      : '';
  }

  async syncData(syncContext: DataRequestContext) {
    // no-op by default
  }

  getMbLayerIds(): string[] {
    throw new Error('Should implement AbstractLayer#getMbLayerIds');
  }

  ownsMbLayerId(layerId: string): boolean {
    throw new Error('Should implement AbstractLayer#ownsMbLayerId');
  }

  ownsMbSourceId(mbSourceId: string): boolean {
    throw new Error('Should implement AbstractLayer#ownsMbSourceId');
  }

  syncLayerWithMB(mbMap: MbMap) {
    throw new Error('Should implement AbstractLayer#syncLayerWithMB');
  }

  getLayerTypeIconName(): string {
    throw new Error('should implement Layer#getLayerTypeIconName');
  }

  isInitialDataLoadComplete(): boolean {
    const sourceDataRequest = this.getSourceDataRequest();
    return sourceDataRequest ? sourceDataRequest.hasData() : false;
  }

  async getBounds(dataRequestContext: DataRequestContext): Promise<MapExtent | null> {
    return null;
  }

  renderStyleEditor(
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void,
    onCustomIconsChange: (customIcons: CustomIcon[]) => void
  ): ReactElement<any> | null {
    const style = this.getStyleForEditing();
    if (!style) {
      return null;
    }
    return style.renderEditor(onStyleDescriptorChange, onCustomIconsChange);
  }

  getIndexPatternIds(): string[] {
    return [];
  }

  getQueryableIndexPatternIds(): string[] {
    return [];
  }

  syncVisibilityWithMb(mbMap: unknown, mbLayerId: string) {
    // @ts-expect-error
    mbMap.setLayoutProperty(mbLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
  }

  getType(): LAYER_TYPE {
    return this._descriptor.type as LAYER_TYPE;
  }

  areLabelsOnTop(): boolean {
    return false;
  }

  supportsLabelsOnTop(): boolean {
    return false;
  }

  async getLicensedFeatures(): Promise<LICENSED_FEATURES[]> {
    return [];
  }

  getGeoFieldNames(): string[] {
    const source = this.getSource();
    return source.isESSource() ? [(source as IESSource).getGeoFieldName()] : [];
  }

  async getStyleMetaDescriptorFromLocalFeatures(): Promise<StyleMetaDescriptor | null> {
    return null;
  }

  isBasemap(order: number): boolean {
    return false;
  }

  _getMetaFromTiles(): TileMetaFeature[] {
    return this._descriptor.__metaFromTiles || [];
  }
}
