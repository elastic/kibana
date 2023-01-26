/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Map as MbMap, LayerSpecification, StyleSpecification } from '@kbn/mapbox-gl';
import { type blendMode, type EmsSpriteSheet, TMSService } from '@elastic/ems-client';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import { EuiIcon } from '@elastic/eui';
import { RGBAImage } from './image_utils';
import { AbstractLayer, type LayerIcon } from '../layer';
import {
  AUTOSELECT_EMS_LOCALE,
  NO_EMS_LOCALE,
  SOURCE_DATA_REQUEST_ID,
  LAYER_TYPE,
} from '../../../../common/constants';
import { EMSVectorTileLayerDescriptor } from '../../../../common/descriptor_types';
import { DataRequest } from '../../util/data_request';
import { isRetina } from '../../../util';
import { DataRequestContext } from '../../../actions';
import { EMSTMSSource } from '../../sources/ems_tms_source';
import { EMSVectorTileStyle } from '../../styles/ems/ems_vector_tile_style';

interface SourceRequestMeta {
  tileLayerId: string;
}

interface SourceRequestData {
  spriteSheetImageData?: ImageData;
  vectorStyleSheet?: StyleSpecification;
  spriteMeta?: {
    png: string;
    json: EmsSpriteSheet;
  };
}

export class EmsVectorTileLayer extends AbstractLayer {
  private readonly _style: EMSVectorTileStyle;

  static createDescriptor(
    options: Partial<EMSVectorTileLayerDescriptor>
  ): EMSVectorTileLayerDescriptor {
    const emsVectorTileLayerDescriptor = super.createDescriptor(
      options
    ) as EMSVectorTileLayerDescriptor;
    emsVectorTileLayerDescriptor.type = LAYER_TYPE.EMS_VECTOR_TILE;
    emsVectorTileLayerDescriptor.alpha = _.get(options, 'alpha', 1);
    emsVectorTileLayerDescriptor.locale = _.get(options, 'locale', AUTOSELECT_EMS_LOCALE);
    emsVectorTileLayerDescriptor.style = EMSVectorTileStyle.createDescriptor();
    return emsVectorTileLayerDescriptor;
  }

  constructor({
    source,
    layerDescriptor,
  }: {
    source: EMSTMSSource;
    layerDescriptor: EMSVectorTileLayerDescriptor;
  }) {
    super({ source, layerDescriptor });
    if (!layerDescriptor.style) {
      const defaultStyle = EMSVectorTileStyle.createDescriptor();
      this._style = new EMSVectorTileStyle(defaultStyle);
    } else {
      this._style = new EMSVectorTileStyle(layerDescriptor.style);
    }
  }

  isInitialDataLoadComplete(): boolean {
    return !!this._descriptor.__areTilesLoaded;
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

  getLocale() {
    return this._descriptor.locale ?? NO_EMS_LOCALE;
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

  _getVectorStyle(): StyleSpecification | null | undefined {
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
      mbMap.addImage(imageId, data as RGBAImage & { width: number; height: number }, {
        pixelRatio,
        sdf,
      });
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
            'source' in layer && typeof layer.source === 'string'
              ? (layer.source as string)
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

  _setColorFilter(mbMap: MbMap, mbLayer: LayerSpecification, mbLayerId: string) {
    const color = this.getCurrentStyle().getColor();

    const colorOperation = TMSService.colorOperationDefaults.find(({ style }) => {
      return style === this.getSource().getTileLayerId();
    });
    if (!colorOperation) return;
    const { operation, percentage } = colorOperation;

    const properties = TMSService.transformColorProperties(
      mbLayer,
      color,
      operation as unknown as blendMode,
      percentage
    );
    for (const { property, color: newColor } of properties) {
      mbMap.setPaintProperty(mbLayerId, property, newColor);
    }
  }

  _setOpacityForType(mbMap: MbMap, mbLayer: LayerSpecification, mbLayerId: string) {
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

  _setLanguage(mbMap: MbMap, mbLayer: LayerSpecification, mbLayerId: string) {
    const locale = this.getLocale();
    if (locale === null || locale === NO_EMS_LOCALE) {
      if (mbLayer.type !== 'symbol') return;

      const textProperty = mbLayer.layout?.['text-field'];
      if (mbLayer.layout && textProperty) {
        mbMap.setLayoutProperty(mbLayerId, 'text-field', textProperty);
      }
      return;
    }

    const textProperty =
      locale === AUTOSELECT_EMS_LOCALE
        ? TMSService.transformLanguageProperty(mbLayer, i18n.getLocale())
        : TMSService.transformLanguageProperty(mbLayer, locale);
    if (textProperty !== undefined) {
      mbMap.setLayoutProperty(mbLayerId, 'text-field', textProperty);
    }
  }

  _setLayerZoomRange(mbMap: MbMap, mbLayer: LayerSpecification, mbLayerId: string) {
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
      this._setColorFilter(mbMap, mbLayer, mbLayerId);
      this._setLanguage(mbMap, mbLayer, mbLayerId);
    });
  }

  areLabelsOnTop() {
    return !!this._descriptor.areLabelsOnTop;
  }

  supportsLabelsOnTop() {
    return true;
  }

  supportsLabelLocales(): boolean {
    return true;
  }

  async getLicensedFeatures() {
    return this._source.getLicensedFeatures();
  }

  getLayerTypeIconName() {
    return 'grid';
  }

  getLayerIcon(): LayerIcon {
    return {
      icon: <EuiIcon size="m" type="grid" />,
      tooltipContent: i18n.translate('xpack.maps.emsVectorTileLayer.layerDescription', {
        defaultMessage: `Reference map provided by Elastic Maps Service (EMS).`,
      }),
    };
  }

  isBasemap(order: number) {
    return order === 0;
  }
}
