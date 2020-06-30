/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { VectorStyle } from '../../styles/vector/vector_style';
import { SOURCE_DATA_REQUEST_ID, LAYER_TYPE } from '../../../../common/constants';
import { VectorLayer, VectorLayerArguments } from '../vector_layer/vector_layer';
import { canSkipSourceUpdate } from '../../util/can_skip_fetch';
import { ITiledSingleLayerVectorSource } from '../../sources/vector_source';
import { DataRequestContext } from '../../../actions';
import { ISource } from '../../sources/source';
import {
  VectorLayerDescriptor,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { MVTSingleLayerVectorSourceConfig } from '../../sources/mvt_single_layer_vector_source/mvt_single_layer_vector_source_editor';

export class TiledVectorLayer extends VectorLayer {
  static type = LAYER_TYPE.TILED_VECTOR;

  static createDescriptor(
    descriptor: Partial<VectorLayerDescriptor>,
    mapColors: string[]
  ): VectorLayerDescriptor {
    const layerDescriptor = super.createDescriptor(descriptor, mapColors);
    layerDescriptor.type = TiledVectorLayer.type;

    if (!layerDescriptor.style) {
      const styleProperties = VectorStyle.createDefaultStyleProperties(mapColors);
      layerDescriptor.style = VectorStyle.createDescriptor(styleProperties);
    }

    return layerDescriptor;
  }

  readonly _source: ITiledSingleLayerVectorSource; // downcast to the more specific type

  constructor({ layerDescriptor, source }: VectorLayerArguments) {
    super({ layerDescriptor, source });
    this._source = source as ITiledSingleLayerVectorSource;
  }

  getCustomIconAndTooltipContent() {
    return {
      icon: <EuiIcon size="m" type={this.getLayerTypeIconName()} />,
    };
  }

  async _syncMVTUrlTemplate({
    startLoading,
    stopLoading,
    onLoadError,
    dataFilters,
  }: DataRequestContext) {
    const requestToken: symbol = Symbol(`layer-${this.getId()}-${SOURCE_DATA_REQUEST_ID}`);
    const searchFilters: VectorSourceRequestMeta = this._getSearchFilters(
      dataFilters,
      this.getSource(),
      this._style
    );
    const prevDataRequest = this.getSourceDataRequest();

    const canSkip = await canSkipSourceUpdate({
      source: this._source as ISource,
      prevDataRequest,
      nextMeta: searchFilters,
    });
    if (canSkip) {
      return null;
    }

    startLoading(SOURCE_DATA_REQUEST_ID, requestToken, searchFilters);
    try {
      const templateWithMeta = await this._source.getUrlTemplateWithMeta();
      stopLoading(SOURCE_DATA_REQUEST_ID, requestToken, templateWithMeta, {});
    } catch (error) {
      onLoadError(SOURCE_DATA_REQUEST_ID, requestToken, error.message);
    }
  }

  async syncData(syncContext: DataRequestContext) {
    await this._syncSourceStyleMeta(syncContext, this._source, this._style);
    await this._syncSourceFormatters(syncContext, this._source, this._style);
    await this._syncMVTUrlTemplate(syncContext);
  }

  _syncSourceBindingWithMb(mbMap: unknown) {
    // @ts-ignore
    const mbSource = mbMap.getSource(this.getId());
    if (!mbSource) {
      const sourceDataRequest = this.getSourceDataRequest();
      if (!sourceDataRequest) {
        // this is possible if the layer was invisible at startup.
        // the actions will not perform any data=syncing as an optimization when a layer is invisible
        // when turning the layer back into visible, it's possible the url has not been resovled yet.
        return;
      }

      const sourceMeta: MVTSingleLayerVectorSourceConfig | null = sourceDataRequest.getData() as MVTSingleLayerVectorSourceConfig;
      if (!sourceMeta) {
        return;
      }

      const sourceId = this.getId();

      // @ts-ignore
      mbMap.addSource(sourceId, {
        type: 'vector',
        tiles: [sourceMeta.urlTemplate],
        minzoom: sourceMeta.minSourceZoom,
        maxzoom: sourceMeta.maxSourceZoom,
      });
    }
  }

  _syncStylePropertiesWithMb(mbMap: unknown) {
    // @ts-ignore
    const mbSource = mbMap.getSource(this.getId());
    if (!mbSource) {
      return;
    }

    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return;
    }
    const sourceMeta: MVTSingleLayerVectorSourceConfig = sourceDataRequest.getData() as MVTSingleLayerVectorSourceConfig;

    this._setMbPointsProperties(mbMap, sourceMeta.layerName);
    this._setMbLinePolygonProperties(mbMap, sourceMeta.layerName);
  }

  _requiresPrevSourceCleanup(mbMap: unknown): boolean {
    // @ts-ignore
    const mbTileSource = mbMap.getSource(this.getId());
    if (!mbTileSource) {
      return false;
    }
    const dataRequest = this.getSourceDataRequest();
    if (!dataRequest) {
      return false;
    }
    const tiledSourceMeta: MVTSingleLayerVectorSourceConfig | null = dataRequest.getData() as MVTSingleLayerVectorSourceConfig;
    if (
      mbTileSource.tiles[0] === tiledSourceMeta.urlTemplate &&
      mbTileSource.minzoom === tiledSourceMeta.minSourceZoom &&
      mbTileSource.maxzoom === tiledSourceMeta.maxSourceZoom
    ) {
      // TileURL and zoom-range captures all the state. If this does not change, no updates are required.
      return false;
    }

    return true;
  }

  syncLayerWithMB(mbMap: unknown) {
    this._removeStaleMbSourcesAndLayers(mbMap);
    this._syncSourceBindingWithMb(mbMap);
    this._syncStylePropertiesWithMb(mbMap);
  }

  getJoins() {
    return [];
  }

  getMinZoom() {
    // higher resolution vector tiles cannot be displayed at lower-res
    return Math.max(this._source.getMinZoom(), super.getMinZoom());
  }
}
