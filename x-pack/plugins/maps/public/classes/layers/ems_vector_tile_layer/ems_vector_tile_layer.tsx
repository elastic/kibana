/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap, Layer as MbLayer, Style as MbStyle } from '@kbn/mapbox-gl';
import _ from 'lodash';
// @ts-expect-error
import { RGBAImage } from './image_utils';
import { AbstractLayer } from '../layer';
import { SOURCE_DATA_REQUEST_ID, LAYER_TYPE, LAYER_STYLE_TYPE } from '../../../../common/constants';
import { LayerDescriptor } from '../../../../common/descriptor_types';
import { DataRequest } from '../../util/data_request';
import { isRetina } from '../../../util';
import { DataRequestContext } from '../../../actions';
import { EMSTMSSource } from '../../sources/ems_tms_source';
import { TileStyle } from '../../styles/tile/tile_style';

interface SourceRequestMeta {
  tileLayerId: string;
}

// TODO remove once ems_client exports EmsSpriteSheet and EmsSprite type
interface EmsSprite {
  height: number;
  pixelRatio: number;
  sdf?: boolean;
  width: number;
  x: number;
  y: number;
}

export interface EmsSpriteSheet {
  [spriteName: string]: EmsSprite;
}

interface SourceRequestData {
  spriteSheetImageData?: ImageData;
  vectorStyleSheet?: MbStyle;
  spriteMeta?: {
    png: string;
    json: EmsSpriteSheet;
  };
}

export class EmsVectorTileLayer extends AbstractLayer {
  static createDescriptor(options: Partial<LayerDescriptor>) {
    const tileLayerDescriptor = super.createDescriptor(options);
    tileLayerDescriptor.type = LAYER_TYPE.EMS_VECTOR_TILE;
    tileLayerDescriptor.alpha = _.get(options, 'alpha', 1);
    tileLayerDescriptor.style = { type: LAYER_STYLE_TYPE.TILE };
    return tileLayerDescriptor;
  }

  private readonly _style: TileStyle;

  constructor({
    source,
    layerDescriptor,
  }: {
    source: EMSTMSSource;
    layerDescriptor: LayerDescriptor;
  }) {
    super({ source, layerDescriptor });
    this._style = new TileStyle();
  }

  getSource(): EMSTMSSource {
    return super.getSource() as EMSTMSSource;
  }

  getStyleForEditing() {
    return this._style;
  }

  getStyle() {
    return this._style;
  }

  getCurrentStyle() {
    return this._style;
  }

  _canSkipSync({
    prevDataRequest,
    nextMeta,
  }: {
    prevDataRequest?: DataRequest;
    nextMeta: SourceRequestMeta;
  }) {
    if (!prevDataRequest) {
      return false;
    }
    const prevMeta = prevDataRequest.getMeta() as SourceRequestMeta;
    if (!prevMeta) {
      return false;
    }

    return prevMeta.tileLayerId === nextMeta.tileLayerId;
  }

  async syncData({ startLoading, stopLoading, onLoadError }: DataRequestContext) {
    const nextMeta = { tileLayerId: this.getSource().getTileLayerId() };
    const canSkipSync = this._canSkipSync({
      prevDataRequest: this.getSourceDataRequest(),
      nextMeta,
    });
    if (canSkipSync) {
      return;
    }

    const requestToken = Symbol(`layer-source-refresh:${this.getId()} - source`);
    try {
      startLoading(SOURCE_DATA_REQUEST_ID, requestToken, nextMeta);
      const styleAndSprites = await this.getSource().getVectorStyleSheetAndSpriteMeta(isRetina());
      const spriteSheetImageData = styleAndSprites.spriteMeta
        ? await this._loadSpriteSheetImageData(styleAndSprites.spriteMeta.png)
        : undefined;
      const data = {
        ...styleAndSprites,
        spriteSheetImageData,
      };
      stopLoading(SOURCE_DATA_REQUEST_ID, requestToken, data);
    } catch (error) {
      onLoadError(SOURCE_DATA_REQUEST_ID, requestToken, error.message);
    }
  }

  _generateMbId(name: string) {
    return `${this.getId()}_${name}`;
  }

  _generateMbSourceIdPrefix() {
    const DELIMITTER = '___';
    return `${this.getId()}${DELIMITTER}${this.getSource().getTileLayerId()}${DELIMITTER}`;
  }

  _generateMbSourceId(name: string | undefined) {
    return `${this._generateMbSourceIdPrefix()}${name}`;
  }

  _getVectorStyle() {
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return null;
    }
    return (sourceDataRequest.getData() as SourceRequestData)?.vectorStyleSheet;
  }

  _getSpriteMeta() {
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return null;
    }
    return (sourceDataRequest.getData() as SourceRequestData)?.spriteMeta;
  }

  _getSpriteImageData() {
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return null;
    }
    return (sourceDataRequest.getData() as SourceRequestData)?.spriteSheetImageData;
  }

  getMbLayerIds() {
    const vectorStyle = this._getVectorStyle();
    if (!vectorStyle || !vectorStyle.layers) {
      return [];
    }
    return vectorStyle.layers.map((layer) => this._generateMbId(layer.id));
  }

  getMbSourceIds() {
    const vectorStyle = this._getVectorStyle();
    if (!vectorStyle || !vectorStyle.sources) {
      return [];
    }
    const sourceIds = Object.keys(vectorStyle.sources);
    return sourceIds.map((sourceId) => this._generateMbSourceId(sourceId));
  }

  ownsMbLayerId(mbLayerId: string) {
    return mbLayerId.startsWith(this.getId());
  }

  ownsMbSourceId(mbSourceId: string) {
    return mbSourceId.startsWith(this.getId());
  }

  _makeNamespacedImageId(imageId: string) {
    const prefix = this.getSource().getSpriteNamespacePrefix() + '/';
    return prefix + imageId;
  }

  _requiresPrevSourceCleanup(mbMap: MbMap) {
    const sourceIdPrefix = this._generateMbSourceIdPrefix();
    const mbStyle = mbMap.getStyle();
    if (!mbStyle.sources) {
      return false;
    }
    return Object.keys(mbStyle.sources).some((mbSourceId) => {
      const doesMbSourceBelongToLayer = this.ownsMbSourceId(mbSourceId);
      const doesMbSourceBelongToSource = mbSourceId.startsWith(sourceIdPrefix);
      return doesMbSourceBelongToLayer && !doesMbSourceBelongToSource;
    });
  }

  _getImageData(img: HTMLImageElement) {
    const canvas = window.document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('failed to create canvas 2d context');
    }
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0, img.width, img.height);
    return context.getImageData(0, 0, img.width, img.height);
  }

  _isCrossOriginUrl(url: string) {
    const a = window.document.createElement('a');
    a.href = url;
    return (
      a.protocol !== window.document.location.protocol ||
      a.host !== window.document.location.host ||
      a.port !== window.document.location.port
    );
  }

  _loadSpriteSheetImageData(imgUrl: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      if (this._isCrossOriginUrl(imgUrl)) {
        image.crossOrigin = 'Anonymous';
      }
      image.onload = (event) => {
        resolve(this._getImageData(image));
      };
      image.onerror = (e) => {
        reject(e);
      };
      image.src = imgUrl;
    });
  }

  _addSpriteSheetToMapFromImageData(json: EmsSpriteSheet, imgData: ImageData, mbMap: MbMap) {
    for (const imageId in json) {
      if (!(json.hasOwnProperty(imageId) && !mbMap.hasImage(imageId))) {
        continue;
      }
      const { width, height, x, y, sdf, pixelRatio } = json[imageId];
      if (typeof width !== 'number' || typeof height !== 'number') {
        continue;
      }

      const data = new RGBAImage({ width, height });
      RGBAImage.copy(imgData, data, { x, y }, { x: 0, y: 0 }, { width, height });
      mbMap.addImage(imageId, data, { pixelRatio, sdf });
    }
  }

  syncLayerWithMB(mbMap: MbMap) {
    const vectorStyle = this._getVectorStyle();
    if (!vectorStyle) {
      return;
    }

    this._removeStaleMbSourcesAndLayers(mbMap);

    let initialBootstrapCompleted = false;
    const sourceIds = vectorStyle.sources ? Object.keys(vectorStyle.sources) : [];
    sourceIds.forEach((sourceId) => {
      if (initialBootstrapCompleted) {
        return;
      }
      const mbSourceId = this._generateMbSourceId(sourceId);
      const mbSource = mbMap.getSource(mbSourceId);
      if (mbSource) {
        // if a single source is present, the layer already has bootstrapped with the mbMap
        initialBootstrapCompleted = true;
        return;
      }
      mbMap.addSource(mbSourceId, vectorStyle.sources![sourceId]);
    });

    if (!initialBootstrapCompleted) {
      // sync spritesheet
      const spriteMeta = this._getSpriteMeta();
      if (!spriteMeta) {
        return;
      }
      const newJson: EmsSpriteSheet = {};
      for (const imageId in spriteMeta.json) {
        if (spriteMeta.json.hasOwnProperty(imageId)) {
          const namespacedImageId = this._makeNamespacedImageId(imageId);
          newJson[namespacedImageId] = spriteMeta.json[imageId];
        }
      }

      const imageData = this._getSpriteImageData();
      if (!imageData) {
        return;
      }
      this._addSpriteSheetToMapFromImageData(newJson, imageData, mbMap);

      // sync layers
      const layers = vectorStyle.layers ? vectorStyle.layers : [];
      layers.forEach((layer) => {
        const mbLayerId = this._generateMbId(layer.id);
        const mbLayer = mbMap.getLayer(mbLayerId);
        if (mbLayer) {
          return;
        }
        const newLayerObject = {
          ...layer,
          source: this._generateMbSourceId(
            typeof (layer as MbLayer).source === 'string'
              ? ((layer as MbLayer).source as string)
              : undefined
          ),
          id: mbLayerId,
        };

        if (
          newLayerObject.type === 'symbol' &&
          newLayerObject.layout &&
          typeof newLayerObject.layout['icon-image'] === 'string'
        ) {
          newLayerObject.layout['icon-image'] = this._makeNamespacedImageId(
            newLayerObject.layout['icon-image']
          );
        }

        if (
          newLayerObject.type === 'fill' &&
          newLayerObject.paint &&
          typeof newLayerObject.paint['fill-pattern'] === 'string'
        ) {
          newLayerObject.paint['fill-pattern'] = this._makeNamespacedImageId(
            newLayerObject.paint['fill-pattern']
          );
        }

        mbMap.addLayer(newLayerObject);
      });
    }

    this._setTileLayerProperties(mbMap);
  }

  _getOpacityProps(layerType: string): string[] {
    if (layerType === 'fill') {
      return ['fill-opacity'];
    }

    if (layerType === 'line') {
      return ['line-opacity'];
    }

    if (layerType === 'circle') {
      return ['circle-opacity'];
    }

    if (layerType === 'background') {
      return ['background-opacity'];
    }

    if (layerType === 'symbol') {
      return ['icon-opacity', 'text-opacity'];
    }

    return [];
  }

  _setOpacityForType(mbMap: MbMap, mbLayer: MbLayer, mbLayerId: string) {
    this._getOpacityProps(mbLayer.type).forEach((opacityProp) => {
      const mbPaint = mbLayer.paint as { [key: string]: unknown } | undefined;
      if (mbPaint && typeof mbPaint[opacityProp] === 'number') {
        const newOpacity = (mbPaint[opacityProp] as number) * this.getAlpha();
        mbMap.setPaintProperty(mbLayerId, opacityProp, newOpacity);
      } else {
        mbMap.setPaintProperty(mbLayerId, opacityProp, this.getAlpha());
      }
    });
  }

  _setLayerZoomRange(mbMap: MbMap, mbLayer: MbLayer, mbLayerId: string) {
    let minZoom = this.getMinZoom();
    if (typeof mbLayer.minzoom === 'number') {
      minZoom = Math.max(minZoom, mbLayer.minzoom);
    }
    let maxZoom = this.getMaxZoom();
    if (typeof mbLayer.maxzoom === 'number') {
      maxZoom = Math.min(maxZoom, mbLayer.maxzoom);
    }
    mbMap.setLayerZoomRange(mbLayerId, minZoom, maxZoom);
  }

  _setTileLayerProperties(mbMap: MbMap) {
    const vectorStyle = this._getVectorStyle();
    if (!vectorStyle || !vectorStyle.layers) {
      return;
    }

    vectorStyle.layers.forEach((mbLayer) => {
      const mbLayerId = this._generateMbId(mbLayer.id);
      this.syncVisibilityWithMb(mbMap, mbLayerId);
      this._setLayerZoomRange(mbMap, mbLayer, mbLayerId);
      this._setOpacityForType(mbMap, mbLayer, mbLayerId);
    });
  }

  areLabelsOnTop() {
    return !!this._descriptor.areLabelsOnTop;
  }

  supportsLabelsOnTop() {
    return true;
  }

  async getLicensedFeatures() {
    return this._source.getLicensedFeatures();
  }

  getLayerTypeIconName() {
    return 'grid';
  }

  isBasemap(order: number) {
    return order === 0;
  }
}
