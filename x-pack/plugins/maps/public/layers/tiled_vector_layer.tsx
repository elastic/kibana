/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import _ from 'lodash';
import { IVectorStyle, VectorStyle } from './styles/vector/vector_style';
import { SOURCE_DATA_ID_ORIGIN, LAYER_TYPE } from '../../common/constants';
import { VectorLayer, VectorLayerArguments } from './vector_layer';
import { canSkipSourceUpdate } from './util/can_skip_fetch';
import { ITiledSingleLayerVectorSource, IVectorSource } from './sources/vector_source';
import { SyncContext } from '../actions/map_actions';
import { ISource } from './sources/source';
import {
  DataMeta,
  MapFilters,
  VectorLayerDescriptor,
  VectorSourceRequestMeta,
} from '../../common/descriptor_types';

export class SingleTiledVectorLayer extends VectorLayer {
  static type = LAYER_TYPE.TILED_VECTOR;

  static createDescriptor(
    options: VectorLayerArguments,
    mapColors: string[]
  ): VectorLayerDescriptor {
    const layerDescriptor = super.createDescriptor(options, mapColors);
    layerDescriptor.type = SingleTiledVectorLayer.type;

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

  _getSearchFilters(
    dataFilters: MapFilters,
    source: IVectorSource,
    style: IVectorStyle
  ): VectorSourceRequestMeta {
    const fieldNames = [...source.getFieldNames(), ...style.getSourceFieldNames()];

    return {
      ...dataFilters,
      fieldNames: _.uniq(fieldNames).sort(),
      sourceQuery: this.getQuery(),
      applyGlobalQuery: this._source.getApplyGlobalQuery(),
    };
  }

  async _syncMVTUrlTemplate({
    startLoading,
    stopLoading,
    onLoadError,
    registerCancelCallback,
    dataFilters,
  }: SyncContext) {
    const requestToken: symbol = Symbol(`layer-${this.getId()}-${SOURCE_DATA_ID_ORIGIN}`);
    const searchFilters: DataMeta = this._getSearchFilters(
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

    startLoading(SOURCE_DATA_ID_ORIGIN, requestToken, searchFilters);
    try {
      const templateWithMeta = await this._source.getUrlTemplateWithMeta();
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, templateWithMeta, {});
    } catch (error) {
      onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
    }
  }

  async syncData(syncContext: SyncContext) {
    if (!this.isVisible() || !this.showAtZoomLevel(syncContext.dataFilters.zoom)) {
      return;
    }

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

      const sourceMeta: {
        layerName: string;
        urlTemplate: string;
        minZoom: number;
        maxZoom: number;
      } | null = sourceDataRequest.getData() as {
        layerName: string;
        urlTemplate: string;
        minZoom: number;
        maxZoom: number;
      };
      if (!sourceMeta) {
        return;
      }

      const sourceId = this.getId();

      // @ts-ignore
      mbMap.addSource(sourceId, {
        type: 'vector',
        tiles: [sourceMeta.urlTemplate],
        minzoom: sourceMeta.minZoom,
        maxzoom: sourceMeta.maxZoom,
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
    const sourceMeta: {
      layerName: string;
    } = sourceDataRequest.getData() as {
      layerName: string;
    };
    const options = { mvtSourceLayer: sourceMeta.layerName };

    this._setMbPointsProperties(mbMap, options);
    this._setMbLinePolygonProperties(mbMap, options);
  }

  _requiresPrevSourceCleanup(mbMap: unknown) {
    // @ts-ignore
    const mbTileSource = mbMap.getSource(this.getId());
    if (!mbTileSource) {
      return false;
    }
    const dataRequest = this.getSourceDataRequest();
    if (!dataRequest) {
      return false;
    }
    const tiledSourceMeta: {
      urlTemplate: string;
      minZoom: number;
      maxZoom: number;
    } | null = dataRequest.getData() as {
      urlTemplate: string;
      minZoom: number;
      maxZoom: number;
    };
    if (
      mbTileSource.tiles[0] === tiledSourceMeta.urlTemplate &&
      mbTileSource.minzoom === tiledSourceMeta.minZoom &&
      mbTileSource.maxzoom === tiledSourceMeta.maxZoom
    ) {
      // TileURL and zoom-range captures all the state. If this does not change, no updates are required.
      return false;
    }

    return true;
  }

  syncLayerWithMB(mbMap: unknown) {
    const requiresCleanup = this._requiresPrevSourceCleanup(mbMap);
    if (requiresCleanup) {
      // @ts-ignore
      const mbStyle = mbMap.getStyle();
      // @ts-ignore
      mbStyle.layers.forEach(mbLayer => {
        if (this.ownsMbLayerId(mbLayer.id)) {
          // @ts-ignore
          mbMap.removeLayer(mbLayer.id);
        }
      });
      // @ts-ignore
      Object.keys(mbStyle.sources).some(mbSourceId => {
        if (this.ownsMbSourceId(mbSourceId)) {
          // @ts-ignore
          mbMap.removeSource(mbSourceId);
        }
      });
    }

    this._syncSourceBindingWithMb(mbMap);
    this._syncStylePropertiesWithMb(mbMap);
  }

  getJoins() {
    return [];
  }

  getMinZoomForData(): number {
    return this._source.getMinZoom();
  }

  getMinZoom() {
    // higher resolution vector tiles cannot be displayed at lower-res
    return Math.max(this.getMinZoomForData(), super.getMinZoom());
  }
}
