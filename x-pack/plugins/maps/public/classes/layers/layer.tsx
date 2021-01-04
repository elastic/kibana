/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Query } from 'src/plugins/data/public';
import _ from 'lodash';
import React, { ReactElement } from 'react';
import { EuiIcon } from '@elastic/eui';
import uuid from 'uuid/v4';
import { FeatureCollection } from 'geojson';
import { DataRequest } from '../util/data_request';
import {
  AGG_TYPE,
  FIELD_ORIGIN,
  MAX_ZOOM,
  MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER,
  MIN_ZOOM,
  SOURCE_DATA_REQUEST_ID,
  STYLE_TYPE,
} from '../../../common/constants';
import { copyPersistentState } from '../../reducers/util';
import {
  AggDescriptor,
  JoinDescriptor,
  LayerDescriptor,
  MapExtent,
  StyleDescriptor,
} from '../../../common/descriptor_types';
import { Attribution, ImmutableSourceProperty, ISource, SourceEditorArgs } from '../sources/source';
import { DataRequestContext } from '../../actions';
import { IStyle } from '../styles/style';
import { getJoinAggKey } from '../../../common/get_agg_key';
import { LICENSED_FEATURES } from '../../licensed_features';

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
  renderSourceSettingsEditor({ onChange }: SourceEditorArgs): ReactElement<any> | null;
  isLayerLoading(): boolean;
  isFilteredByGlobalTime(): Promise<boolean>;
  hasErrors(): boolean;
  getErrors(): string;
  getMbLayerIds(): string[];
  ownsMbLayerId(mbLayerId: string): boolean;
  ownsMbSourceId(mbSourceId: string): boolean;
  canShowTooltip(): boolean;
  syncLayerWithMB(mbMap: unknown): void;
  getLayerTypeIconName(): string;
  isDataLoaded(): boolean;
  getIndexPatternIds(): string[];
  getQueryableIndexPatternIds(): string[];
  getType(): string | undefined;
  isVisible(): boolean;
  cloneDescriptor(): Promise<LayerDescriptor>;
  renderStyleEditor(
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void
  ): ReactElement<any> | null;
  getInFlightRequestTokens(): symbol[];
  getPrevRequestToken(dataId: string): symbol | undefined;
  destroy: () => void;
  isPreviewLayer: () => boolean;
  areLabelsOnTop: () => boolean;
  supportsLabelsOnTop: () => boolean;
  showJoinEditor(): boolean;
  getJoinsDisabledReason(): string | null;
  isFittable(): Promise<boolean>;
  getLicensedFeatures(): Promise<LICENSED_FEATURES[]>;
  getCustomIconAndTooltipContent(): CustomIconAndTooltipContent;
}

export type CustomIconAndTooltipContent = {
  icon: ReactElement<any> | null;
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

  async cloneDescriptor(): Promise<LayerDescriptor> {
    const clonedDescriptor = copyPersistentState(this._descriptor);
    // layer id is uuid used to track styles/layers in mapbox
    clonedDescriptor.id = uuid();
    const displayName = await this.getDisplayName();
    clonedDescriptor.label = `Clone of ${displayName}`;
    clonedDescriptor.sourceDescriptor = this.getSource().cloneDescriptor();

    if (clonedDescriptor.joins) {
      clonedDescriptor.joins.forEach((joinDescriptor: JoinDescriptor) => {
        const originalJoinId = joinDescriptor.right.id!;

        // right.id is uuid used to track requests in inspector
        joinDescriptor.right.id = uuid();

        // Update all data driven styling properties using join fields
        if (clonedDescriptor.style && 'properties' in clonedDescriptor.style) {
          const metrics =
            joinDescriptor.right.metrics && joinDescriptor.right.metrics.length
              ? joinDescriptor.right.metrics
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
              const styleProp = clonedDescriptor.style.properties[key];
              if (
                styleProp.type === STYLE_TYPE.DYNAMIC &&
                styleProp.options.field &&
                styleProp.options.field.origin === FIELD_ORIGIN.JOIN &&
                styleProp.options.field.name === originalJoinKey
              ) {
                styleProp.options.field.name = newJoinKey;
              }
            });
          });
        }
      });
    }
    return clonedDescriptor;
  }

  makeMbLayerId(layerNameSuffix: string): string {
    return `${this.getId()}${MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER}${layerNameSuffix}`;
  }

  showJoinEditor(): boolean {
    return this.getSource().showJoinEditor();
  }

  getJoinsDisabledReason() {
    return this.getSource().getJoinsDisabledReason();
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
    return (await this.supportsFitToBounds()) && this.isVisible();
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
    if (!this.hasErrors()) {
      return await this.getSource().getAttributions();
    }
    return [];
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

  getCustomIconAndTooltipContent(): CustomIconAndTooltipContent {
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

  _getMbSourceId() {
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

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs) {
    const source = this.getSourceForEditing();
    return source.renderSourceSettingsEditor({ onChange, currentLayerType: this._descriptor.type });
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
    return this._dataRequests.some((dataRequest) => dataRequest.isLoading());
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

  canShowTooltip() {
    return false;
  }

  syncLayerWithMB(mbMap: unknown) {
    throw new Error('Should implement AbstractLayer#syncLayerWithMB');
  }

  getLayerTypeIconName(): string {
    throw new Error('should implement Layer#getLayerTypeIconName');
  }

  isDataLoaded(): boolean {
    const sourceDataRequest = this.getSourceDataRequest();
    return sourceDataRequest ? sourceDataRequest.hasData() : false;
  }

  async getBounds(dataRequestContext: DataRequestContext): Promise<MapExtent | null> {
    return null;
  }

  renderStyleEditor(
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void
  ): ReactElement<any> | null {
    const style = this.getStyleForEditing();
    if (!style) {
      return null;
    }
    return style.renderEditor(onStyleDescriptorChange);
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

  getType(): string | undefined {
    return this._descriptor.type;
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
}
