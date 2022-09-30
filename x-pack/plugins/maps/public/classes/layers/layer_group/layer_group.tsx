/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import type { Query } from '@kbn/es-query';
import React, { ReactElement } from 'react';
import { EuiIcon } from '@elastic/eui';
import uuid from 'uuid/v4';
import { LAYER_TYPE, MAX_ZOOM, MIN_ZOOM } from '../../../../common/constants';
import { DataRequest } from '../../util/data_request';
import { copyPersistentState } from '../../../reducers/copy_persistent_state';
import {
  Attribution,
  CustomIcon,
  LayerDescriptor,
  LayerGroupDescriptor,
  MapExtent,
  StyleDescriptor,
  StyleMetaDescriptor,
} from '../../../../common/descriptor_types';
import { ImmutableSourceProperty, ISource, SourceEditorArgs } from '../../sources/source';
import { DataRequestContext } from '../../../actions';
import { ILayer, LayerIcon } from '../layer';
import { IStyle } from '../../styles/style';
import { LICENSED_FEATURES } from '../../../licensed_features';

export class LayerGroup implements ILayer {
  protected readonly _descriptor: LayerGroupDescriptor;

  static createDescriptor(options: Partial<LayerDescriptor>): LayerGroupDescriptor {
    return {
      ...options,
      type: LAYER_TYPE.LAYER_GROUP,
      id: typeof options.id === 'string' && options.id.length ? options.id : uuid(),
      label:
        typeof options.label === 'string' && options.label.length
          ? options.label
          : i18n.translate('xpack.maps.layerGroup.defaultName', {
              defaultMessage: 'Layer group',
            }),
      sourceDescriptor: null,
      visible: typeof options.visible === 'boolean' ? options.visible : true,
    };
  }

  constructor({ layerDescriptor }: { layerDescriptor: LayerGroupDescriptor }) {
    this._descriptor = LayerGroup.createDescriptor(layerDescriptor);
  }

  getDescriptor(): LayerGroupDescriptor {
    return this._descriptor;
  }

  async cloneDescriptor(): Promise<LayerGroupDescriptor> {
    const clonedDescriptor = copyPersistentState(this._descriptor);
    // layer id is uuid used to track styles/layers in mapbox
    clonedDescriptor.id = uuid();
    const displayName = await this.getDisplayName();
    clonedDescriptor.label = `Clone of ${displayName}`;
    return clonedDescriptor;
  }

  makeMbLayerId(layerNameSuffix: string): string {
    throw new Error(
      'makeMbLayerId should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  isPreviewLayer(): boolean {
    return false;
  }

  supportsElasticsearchFilters(): boolean {
    // TODO return childLayers.supportsElasticsearchFilters
    return false;
  }

  async supportsFitToBounds(): Promise<boolean> {
    // TODO return childLayers.supportsFitToBounds
    return true;
  }

  async isFittable(): Promise<boolean> {
    // TODO return childLayers.isFittable
    return false;
  }

  isIncludeInFitToBounds(): boolean {
    // TODO return childLayers.isIncludeInFitToBounds
    return true;
  }

  async isFilteredByGlobalTime(): Promise<boolean> {
    // TODO return childLayers.isFilteredByGlobalTime
    return true;
  }

  async getDisplayName(source?: ISource): Promise<string> {
    return this.getLabel();
  }

  async getAttributions(): Promise<Attribution[]> {
    // TODO return childLayers.getAttributions
    return [];
  }

  getStyleForEditing(): IStyle {
    throw new Error(
      'getStyleForEditing should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getStyle(): IStyle {
    throw new Error(
      'getStyle should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getCurrentStyle(): IStyle {
    throw new Error(
      'getCurrentStyle should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getLabel(): string {
    return this._descriptor.label ? this._descriptor.label : '';
  }

  getLocale(): string | null {
    return null;
  }

  getLayerIcon(isTocIcon: boolean): LayerIcon {
    return {
      icon: <EuiIcon size="m" type="layers" />,
    };
  }

  async hasLegendDetails(): Promise<boolean> {
    return true;
  }

  renderLegendDetails(): ReactElement<any> | null {
    return null;
  }

  getId(): string {
    return this._descriptor.id;
  }

  getSource(): ISource {
    throw new Error(
      'getSource should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getSourceForEditing(): ISource {
    throw new Error(
      'getSourceForEditing should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  isVisible(): boolean {
    return !!this._descriptor.visible;
  }

  showAtZoomLevel(zoom: number): boolean {
    return false;
  }

  getMinZoom(): number {
    return MIN_ZOOM;
  }

  getMaxZoom(): number {
    return MAX_ZOOM;
  }

  getMinSourceZoom(): number {
    throw new Error(
      'getMinSourceZoom should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getMbSourceId(): string {
    throw new Error(
      'getMbSourceId should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getAlpha(): number {
    throw new Error(
      'getAlpha should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getQuery(): Query | null {
    return null;
  }

  async getImmutableSourceProperties(): Promise<ImmutableSourceProperty[]> {
    return [];
  }

  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs) {
    return null;
  }

  getPrevRequestToken(dataId: string): symbol | undefined {
    return undefined;
  }

  getInFlightRequestTokens(): symbol[] {
    return [];
  }

  getSourceDataRequest(): DataRequest | undefined {
    return undefined;
  }

  getDataRequest(id: string): DataRequest | undefined {
    return undefined;
  }

  isLayerLoading(): boolean {
    // TODO return childLayers.some.isLayerLoading()
    return false;
  }

  isLoadingBounds() {
    return false;
  }

  hasErrors(): boolean {
    // TODO return childLayers.some.hasErrors()
    return false;
  }

  getErrors(): string {
    // TODO return childLayers.reduce.getErrors()
    return '';
  }

  async syncData(syncContext: DataRequestContext) {
    // layer group does not render to map so there is never sync data request
  }

  getMbLayerIds(): string[] {
    return [];
  }

  ownsMbLayerId(layerId: string): boolean {
    return false;
  }

  ownsMbSourceId(mbSourceId: string): boolean {
    return false;
  }

  syncLayerWithMB(mbMap: MbMap) {
    // layer group does not render to map so there is never sync data request
  }

  getLayerTypeIconName(): string {
    return 'layers';
  }

  isInitialDataLoadComplete(): boolean {
    return true;
  }

  async getBounds(dataRequestContext: DataRequestContext): Promise<MapExtent | null> {
    // TODO return childLayers.reduce.getBounds()
    return null;
  }

  renderStyleEditor(
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void,
    onCustomIconsChange: (customIcons: CustomIcon[]) => void
  ): ReactElement<any> | null {
    return null;
  }

  getIndexPatternIds(): string[] {
    // TODO return childLayers.reduce.getIndexPatternIds
    return [];
  }

  getQueryableIndexPatternIds(): string[] {
    // TODO return childLayers.reduce.getQueryableIndexPatternIds
    return [];
  }

  syncVisibilityWithMb(mbMap: unknown, mbLayerId: string) {
    throw new Error(
      'syncVisibilityWithMb should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getType(): LAYER_TYPE {
    return LAYER_TYPE.LAYER_GROUP;
  }

  areLabelsOnTop(): boolean {
    return false;
  }

  supportsLabelsOnTop(): boolean {
    return false;
  }

  supportsLabelLocales(): boolean {
    return false;
  }

  async getLicensedFeatures(): Promise<LICENSED_FEATURES[]> {
    return [];
  }

  getGeoFieldNames(): string[] {
    // TODO return childLayers.reduce.getGeoFieldNames
    return [];
  }

  async getStyleMetaDescriptorFromLocalFeatures(): Promise<StyleMetaDescriptor | null> {
    throw new Error(
      'getStyleMetaDescriptorFromLocalFeatures should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  isBasemap(order: number): boolean {
    return false;
  }
}
