/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { Feature } from 'geojson';
import { VectorStyle } from '../../styles/vector/vector_style';
import { SOURCE_DATA_REQUEST_ID, LAYER_TYPE } from '../../../../common/constants';
import { VectorLayer, VectorLayerArguments } from '../vector_layer/vector_layer';
import { ITiledSingleLayerVectorSource } from '../../sources/vector_source';
import { DataRequestContext } from '../../../actions';
import {
  VectorLayerDescriptor,
  VectorSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { MVTSingleLayerVectorSourceConfig } from '../../sources/mvt_single_layer_vector_source/types';

export class TiledVectorLayer extends VectorLayer {
  static type = LAYER_TYPE.TILED_VECTOR;

  static createDescriptor(
    descriptor: Partial<VectorLayerDescriptor>,
    mapColors?: string[]
  ): VectorLayerDescriptor {
    const layerDescriptor = super.createDescriptor(descriptor, mapColors);
    layerDescriptor.type = TiledVectorLayer.type;

    if (!layerDescriptor.style) {
      const styleProperties = VectorStyle.createDefaultStyleProperties(mapColors ? mapColors : []);
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

    if (prevDataRequest) {
      const data: MVTSingleLayerVectorSourceConfig = prevDataRequest.getData() as MVTSingleLayerVectorSourceConfig;
      const canSkipBecauseNoChanges =
        data.layerName === this._source.getLayerName() &&
        data.minSourceZoom === this._source.getMinZoom() &&
        data.maxSourceZoom === this._source.getMaxZoom();

      if (canSkipBecauseNoChanges) {
        return null;
      }
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
    // @ts-expect-error
    const mbSource = mbMap.getSource(this._getMbSourceId());
    if (mbSource) {
      return;
    }
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

    const mbSourceId = this._getMbSourceId();
    // @ts-expect-error
    mbMap.addSource(mbSourceId, {
      type: 'vector',
      tiles: [sourceMeta.urlTemplate],
      minzoom: sourceMeta.minSourceZoom,
      maxzoom: sourceMeta.maxSourceZoom,
    });
  }

  ownsMbSourceId(mbSourceId: string): boolean {
    return this._getMbSourceId() === mbSourceId;
  }

  _syncStylePropertiesWithMb(mbMap: unknown) {
    // @ts-ignore
    const mbSource = mbMap.getSource(this._getMbSourceId());
    if (!mbSource) {
      return;
    }

    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return;
    }
    const sourceMeta: MVTSingleLayerVectorSourceConfig = sourceDataRequest.getData() as MVTSingleLayerVectorSourceConfig;
    if (sourceMeta.layerName === '') {
      return;
    }

    this._setMbPointsProperties(mbMap, sourceMeta.layerName);
    this._setMbLinePolygonProperties(mbMap, sourceMeta.layerName);
  }

  _requiresPrevSourceCleanup(mbMap: unknown): boolean {
    // @ts-expect-error
    const mbTileSource = mbMap.getSource(this._getMbSourceId());
    if (!mbTileSource) {
      return false;
    }

    const dataRequest = this.getSourceDataRequest();
    if (!dataRequest) {
      return false;
    }
    const tiledSourceMeta: MVTSingleLayerVectorSourceConfig | null = dataRequest.getData() as MVTSingleLayerVectorSourceConfig;

    if (!tiledSourceMeta) {
      return false;
    }

    const isSourceDifferent =
      mbTileSource.tiles[0] !== tiledSourceMeta.urlTemplate ||
      mbTileSource.minzoom !== tiledSourceMeta.minSourceZoom ||
      mbTileSource.maxzoom !== tiledSourceMeta.maxSourceZoom;

    if (isSourceDifferent) {
      return true;
    }

    const layerIds = this.getMbLayerIds();
    for (let i = 0; i < layerIds.length; i++) {
      // @ts-expect-error
      const mbLayer = mbMap.getLayer(layerIds[i]);
      if (mbLayer && mbLayer.sourceLayer !== tiledSourceMeta.layerName) {
        // If the source-pointer of one of the layers is stale, they will all be stale.
        // In this case, all the mb-layers need to be removed and re-added.
        return true;
      }
    }

    return false;
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

  getFeatureById(id: string | number): Feature | null {
    return null;
  }
}
