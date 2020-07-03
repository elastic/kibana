/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { Query } from 'src/plugins/data/public';
import _ from 'lodash';
import React, { ReactElement } from 'react';
import { EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import uuid from 'uuid/v4';
import { i18n } from '@kbn/i18n';
import { FeatureCollection } from 'geojson';
import { DataRequest } from '../util/data_request';
import {
  MAX_ZOOM,
  MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER,
  MIN_ZOOM,
  SOURCE_DATA_REQUEST_ID,
} from '../../../common/constants';
import { copyPersistentState } from '../../reducers/util';
import { LayerDescriptor, MapExtent, StyleDescriptor } from '../../../common/descriptor_types';
import { Attribution, ImmutableSourceProperty, ISource, SourceEditorArgs } from '../sources/source';
import { DataRequestContext } from '../../actions';
import { IStyle } from '../styles/style';

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
  getCustomIconAndTooltipContent(): CustomIconAndTooltipContent;
  getIconAndTooltipContent(zoomLevel: number, isUsingSearch: boolean): IconAndTooltipContent;
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
  renderStyleEditor({
    onStyleDescriptorChange,
  }: {
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void;
  }): ReactElement<any> | null;
  getInFlightRequestTokens(): symbol[];
  getPrevRequestToken(dataId: string): symbol | undefined;
  destroy: () => void;
  isPreviewLayer: () => boolean;
  areLabelsOnTop: () => boolean;
  supportsLabelsOnTop: () => boolean;
}
export type Footnote = {
  icon: ReactElement<any>;
  message?: string | null;
};
export type IconAndTooltipContent = {
  icon?: ReactElement<any> | null;
  tooltipContent?: string | null;
  footnotes: Footnote[];
};
export type CustomIconAndTooltipContent = {
  icon: ReactElement<any> | null;
  tooltipContent?: string | null;
  areResultsTrimmed?: boolean;
};

export interface ILayerArguments {
  layerDescriptor: LayerDescriptor;
  source: ISource;
  style: IStyle;
}

export class AbstractLayer implements ILayer {
  protected readonly _descriptor: LayerDescriptor;
  protected readonly _source: ISource;
  protected readonly _style: IStyle;
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

  constructor({ layerDescriptor, source, style }: ILayerArguments) {
    this._descriptor = AbstractLayer.createDescriptor(layerDescriptor);
    this._source = source;
    this._style = style;
    if (this._descriptor.__dataRequests) {
      this._dataRequests = this._descriptor.__dataRequests.map(
        (dataRequest) => new DataRequest(dataRequest)
      );
    } else {
      this._dataRequests = [];
    }
  }

  static getBoundDataForSource(mbMap: unknown, sourceId: string): FeatureCollection {
    // @ts-ignore
    const mbStyle = mbMap.getStyle();
    return mbStyle.sources[sourceId].data;
  }

  async cloneDescriptor(): Promise<LayerDescriptor> {
    // @ts-ignore
    const clonedDescriptor = copyPersistentState(this._descriptor);
    // layer id is uuid used to track styles/layers in mapbox
    clonedDescriptor.id = uuid();
    const displayName = await this.getDisplayName();
    clonedDescriptor.label = `Clone of ${displayName}`;
    clonedDescriptor.sourceDescriptor = this.getSource().cloneDescriptor();

    // todo: remove this
    // This should not be in AbstractLayer. It relies on knowledge of VectorLayerDescriptor
    // @ts-ignore
    if (clonedDescriptor.joins) {
      // @ts-ignore
      clonedDescriptor.joins.forEach((joinDescriptor) => {
        // right.id is uuid used to track requests in inspector
        // @ts-ignore
        joinDescriptor.right.id = uuid();
      });
    }
    return clonedDescriptor;
  }

  makeMbLayerId(layerNameSuffix: string): string {
    return `${this.getId()}${MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER}${layerNameSuffix}`;
  }

  isJoinable(): boolean {
    return this.getSource().isJoinable();
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
    return this._style;
  }

  getStyle() {
    return this._style;
  }

  getLabel(): string {
    return this._descriptor.label ? this._descriptor.label : '';
  }

  getCustomIconAndTooltipContent(): CustomIconAndTooltipContent {
    return {
      icon: <EuiIcon size="m" type={this.getLayerTypeIconName()} />,
    };
  }

  getIconAndTooltipContent(zoomLevel: number, isUsingSearch: boolean): IconAndTooltipContent {
    let icon;
    let tooltipContent = null;
    const footnotes = [];
    if (this.hasErrors()) {
      icon = (
        <EuiIcon
          aria-label={i18n.translate('xpack.maps.layer.loadWarningAriaLabel', {
            defaultMessage: 'Load warning',
          })}
          size="m"
          type="alert"
          color="warning"
        />
      );
      tooltipContent = this.getErrors();
    } else if (this.isLayerLoading()) {
      icon = <EuiLoadingSpinner size="m" />;
    } else if (!this.isVisible()) {
      icon = <EuiIcon size="m" type="eyeClosed" />;
      tooltipContent = i18n.translate('xpack.maps.layer.layerHiddenTooltip', {
        defaultMessage: `Layer is hidden.`,
      });
    } else if (!this.showAtZoomLevel(zoomLevel)) {
      const minZoom = this.getMinZoom();
      const maxZoom = this.getMaxZoom();
      icon = <EuiIcon size="m" type="expand" />;
      tooltipContent = i18n.translate('xpack.maps.layer.zoomFeedbackTooltip', {
        defaultMessage: `Layer is visible between zoom levels {minZoom} and {maxZoom}.`,
        values: { minZoom, maxZoom },
      });
    } else {
      const customIconAndTooltipContent = this.getCustomIconAndTooltipContent();
      if (customIconAndTooltipContent) {
        icon = customIconAndTooltipContent.icon;
        if (!customIconAndTooltipContent.areResultsTrimmed) {
          tooltipContent = customIconAndTooltipContent.tooltipContent;
        } else {
          footnotes.push({
            icon: <EuiIcon color="subdued" type="partial" size="s" />,
            message: customIconAndTooltipContent.tooltipContent,
          });
        }
      }

      if (isUsingSearch && this.getQueryableIndexPatternIds().length) {
        footnotes.push({
          icon: <EuiIcon color="subdued" type="filter" size="s" />,
          message: i18n.translate('xpack.maps.layer.isUsingSearchMsg', {
            defaultMessage: 'Results narrowed by search bar',
          }),
        });
      }
    }

    return {
      icon,
      tooltipContent,
      footnotes,
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

  getCurrentStyle(): IStyle {
    return this._style;
  }

  async getImmutableSourceProperties() {
    const source = this.getSource();
    return await source.getImmutableProperties();
  }

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs) {
    const source = this.getSourceForEditing();
    return source.renderSourceSettingsEditor({ onChange });
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
    // @ts-ignore
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

  renderStyleEditor({
    onStyleDescriptorChange,
  }: {
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void;
  }): ReactElement<any> | null {
    const style = this.getStyleForEditing();
    if (!style) {
      return null;
    }
    return style.renderEditor({ layer: this, onStyleDescriptorChange });
  }

  getIndexPatternIds(): string[] {
    return [];
  }

  getQueryableIndexPatternIds(): string[] {
    return [];
  }

  syncVisibilityWithMb(mbMap: unknown, mbLayerId: string) {
    // @ts-ignore
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
}
