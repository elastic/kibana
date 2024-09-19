/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Map as MbMap,
  GeoJSONSource as MbGeoJSONSource,
  VectorSource as MbVectorSource,
} from '@kbn/mapbox-gl';
import { Feature } from 'geojson';
import uuid from 'uuid/v4';
import { parse as parseUrl } from 'url';
import { i18n } from '@kbn/i18n';
import { IVectorStyle, VectorStyle } from '../../styles/vector/vector_style';
import {
  KBN_FEATURE_COUNT,
  KBN_IS_TILE_COMPLETE,
  KBN_METADATA_FEATURE,
  LAYER_TYPE,
  SOURCE_DATA_REQUEST_ID,
} from '../../../../common/constants';
import {
  VectorLayer,
  VectorLayerArguments,
  NO_RESULTS_ICON_AND_TOOLTIPCONTENT,
} from '../vector_layer';
import { ITiledSingleLayerVectorSource } from '../../sources/tiled_single_layer_vector_source';
import { DataRequestContext } from '../../../actions';
import {
  Timeslice,
  StyleMetaDescriptor,
  VectorLayerDescriptor,
  VectorSourceRequestMeta,
  TileMetaFeature,
} from '../../../../common/descriptor_types';
import { MVTSingleLayerVectorSourceConfig } from '../../sources/mvt_single_layer_vector_source/types';
import { canSkipSourceUpdate } from '../../util/can_skip_fetch';
import { CustomIconAndTooltipContent } from '../layer';

export class TiledVectorLayer extends VectorLayer {
  static type = LAYER_TYPE.TILED_VECTOR;

  static createDescriptor(
    descriptor: Partial<VectorLayerDescriptor>,
    mapColors?: string[]
  ): VectorLayerDescriptor {
    const layerDescriptor = super.createDescriptor(descriptor, mapColors);
    layerDescriptor.type = LAYER_TYPE.TILED_VECTOR;

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

  _getMetaFromTiles(): TileMetaFeature[] {
    return this._descriptor.__metaFromTiles || [];
  }

  getCustomIconAndTooltipContent(): CustomIconAndTooltipContent {
    const tileMetas = this._getMetaFromTiles();
    if (!tileMetas.length) {
      return NO_RESULTS_ICON_AND_TOOLTIPCONTENT;
    }

    const totalFeaturesCount: number = tileMetas.reduce((acc: number, tileMeta: Feature) => {
      const count = tileMeta && tileMeta.properties ? tileMeta.properties[KBN_FEATURE_COUNT] : 0;
      return count + acc;
    }, 0);

    if (totalFeaturesCount === 0) {
      return NO_RESULTS_ICON_AND_TOOLTIPCONTENT;
    }

    const isIncomplete: boolean = tileMetas.some((tileMeta: Feature) => {
      return !tileMeta?.properties?.[KBN_IS_TILE_COMPLETE];
    });

    return {
      icon: this.getCurrentStyle().getIcon(),
      tooltipContent: isIncomplete
        ? i18n.translate('xpack.maps.tiles.resultsTrimmedMsg', {
            defaultMessage: `Results limited to {count} documents.`,
            values: {
              count: totalFeaturesCount.toLocaleString(),
            },
          })
        : i18n.translate('xpack.maps.tiles.resultsCompleteMsg', {
            defaultMessage: `Found {count} documents.`,
            values: {
              count: totalFeaturesCount.toLocaleString(),
            },
          }),
      areResultsTrimmed: isIncomplete,
    };
  }

  async _syncMVTUrlTemplate({
    startLoading,
    stopLoading,
    onLoadError,
    dataFilters,
    isForceRefresh,
  }: DataRequestContext) {
    const requestToken: symbol = Symbol(`layer-${this.getId()}-${SOURCE_DATA_REQUEST_ID}`);
    const requestMeta: VectorSourceRequestMeta = await this._getVectorSourceRequestMeta(
      isForceRefresh,
      dataFilters,
      this.getSource(),
      this._style as IVectorStyle
    );
    const prevDataRequest = this.getSourceDataRequest();
    if (prevDataRequest) {
      const data: MVTSingleLayerVectorSourceConfig =
        prevDataRequest.getData() as MVTSingleLayerVectorSourceConfig;
      if (data) {
        const noChangesInSourceState: boolean =
          data.layerName === this._source.getLayerName() &&
          data.minSourceZoom === this._source.getMinZoom() &&
          data.maxSourceZoom === this._source.getMaxZoom();
        const noChangesInSearchState: boolean = await canSkipSourceUpdate({
          extentAware: false, // spatial extent knowledge is already fully automated by tile-loading based on pan-zooming
          source: this.getSource(),
          prevDataRequest,
          nextRequestMeta: requestMeta,
          getUpdateDueToTimeslice: (timeslice?: Timeslice) => {
            // TODO use meta features to determine if tiles already contain features for timeslice.
            return true;
          },
        });
        const canSkip = noChangesInSourceState && noChangesInSearchState;
        if (canSkip) {
          return null;
        }
      }
    }

    startLoading(SOURCE_DATA_REQUEST_ID, requestToken, requestMeta);
    try {
      const prevData = prevDataRequest
        ? (prevDataRequest.getData() as MVTSingleLayerVectorSourceConfig)
        : undefined;
      const urlToken =
        !prevData || (requestMeta.isForceRefresh && requestMeta.applyForceRefresh)
          ? uuid()
          : prevData.urlToken;

      const newUrlTemplateAndMeta = await this._source.getUrlTemplateWithMeta(requestMeta);

      let urlTemplate;
      if (newUrlTemplateAndMeta.refreshTokenParamName) {
        const parsedUrl = parseUrl(newUrlTemplateAndMeta.urlTemplate, true);
        const separator = !parsedUrl.query || Object.keys(parsedUrl.query).length === 0 ? '?' : '&';
        urlTemplate = `${newUrlTemplateAndMeta.urlTemplate}${separator}${newUrlTemplateAndMeta.refreshTokenParamName}=${urlToken}`;
      } else {
        urlTemplate = newUrlTemplateAndMeta.urlTemplate;
      }

      const urlTemplateAndMetaWithToken = {
        ...newUrlTemplateAndMeta,
        urlToken,
        urlTemplate,
      };
      stopLoading(SOURCE_DATA_REQUEST_ID, requestToken, urlTemplateAndMetaWithToken, {});
    } catch (error) {
      onLoadError(SOURCE_DATA_REQUEST_ID, requestToken, error.message);
    }
  }

  async syncData(syncContext: DataRequestContext) {
    await this._syncSourceStyleMeta(syncContext, this._source, this._style as IVectorStyle);
    await this._syncSourceFormatters(syncContext, this._source, this._style as IVectorStyle);
    await this._syncMVTUrlTemplate(syncContext);
  }

  _syncSourceBindingWithMb(mbMap: MbMap) {
    const mbSource = mbMap.getSource(this._getMbSourceId());
    if (mbSource) {
      return;
    }
    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      // this is possible if the layer was invisible at startup.
      // the actions will not perform any data=syncing as an optimization when a layer is invisible
      // when turning the layer back into visible, it's possible the url had not been resolved yet.
      return;
    }

    const sourceMeta: MVTSingleLayerVectorSourceConfig | null =
      sourceDataRequest.getData() as MVTSingleLayerVectorSourceConfig;
    if (!sourceMeta) {
      return;
    }

    const mbSourceId = this._getMbSourceId();
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

  _syncStylePropertiesWithMb(mbMap: MbMap) {
    // @ts-ignore
    const mbSource = mbMap.getSource(this._getMbSourceId());
    if (!mbSource) {
      return;
    }

    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return;
    }
    const sourceMeta: MVTSingleLayerVectorSourceConfig =
      sourceDataRequest.getData() as MVTSingleLayerVectorSourceConfig;
    if (sourceMeta.layerName === '') {
      return;
    }

    this._setMbPointsProperties(mbMap, sourceMeta.layerName);
    this._setMbLinePolygonProperties(mbMap, sourceMeta.layerName);
    this._setMbCentroidProperties(mbMap, sourceMeta.layerName);
  }

  queryTileMetaFeatures(mbMap: MbMap): TileMetaFeature[] | null {
    // @ts-ignore
    const mbSource = mbMap.getSource(this._getMbSourceId());
    if (!mbSource) {
      return null;
    }

    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return null;
    }
    const sourceMeta: MVTSingleLayerVectorSourceConfig =
      sourceDataRequest.getData() as MVTSingleLayerVectorSourceConfig;
    if (sourceMeta.layerName === '') {
      return null;
    }

    // querySourceFeatures can return duplicated features when features cross tile boundaries.
    // Tile meta will never have duplicated features since by there nature, tile meta is a feature contained within a single tile
    const mbFeatures = mbMap.querySourceFeatures(this._getMbSourceId(), {
      sourceLayer: sourceMeta.layerName,
      filter: ['==', ['get', KBN_METADATA_FEATURE], true],
    });

    const metaFeatures: TileMetaFeature[] = mbFeatures.map((mbFeature: Feature) => {
      const parsedProperties: Record<string, unknown> = {};
      for (const key in mbFeature.properties) {
        if (mbFeature.properties.hasOwnProperty(key)) {
          parsedProperties[key] = JSON.parse(mbFeature.properties[key]); // mvt properties cannot be nested geojson
        }
      }
      return {
        type: 'Feature',
        id: mbFeature.id,
        geometry: mbFeature.geometry,
        properties: parsedProperties,
      } as TileMetaFeature;
    });

    return metaFeatures as TileMetaFeature[];
  }

  _requiresPrevSourceCleanup(mbMap: MbMap): boolean {
    const mbSource = mbMap.getSource(this._getMbSourceId()) as MbVectorSource | MbGeoJSONSource;
    if (!mbSource) {
      return false;
    }
    if (!('tiles' in mbSource)) {
      // Expected source is not compatible, so remove.
      return true;
    }
    const mbTileSource = mbSource as MbVectorSource;

    const dataRequest = this.getSourceDataRequest();
    if (!dataRequest) {
      return false;
    }
    const tiledSourceMeta: MVTSingleLayerVectorSourceConfig | null =
      dataRequest.getData() as MVTSingleLayerVectorSourceConfig;

    if (!tiledSourceMeta) {
      return false;
    }

    const isSourceDifferent =
      mbTileSource.tiles?.[0] !== tiledSourceMeta.urlTemplate ||
      mbTileSource.minzoom !== tiledSourceMeta.minSourceZoom ||
      mbTileSource.maxzoom !== tiledSourceMeta.maxSourceZoom;

    if (isSourceDifferent) {
      return true;
    }

    const layerIds = this.getMbLayerIds();
    for (let i = 0; i < layerIds.length; i++) {
      const mbLayer = mbMap.getLayer(layerIds[i]);
      // The mapbox type in the spec is specified with `source-layer`
      // but the programmable JS-object uses camelcase `sourceLayer`
      // @ts-expect-error
      if (mbLayer && mbLayer.sourceLayer !== tiledSourceMeta.layerName) {
        // If the source-pointer of one of the layers is stale, they will all be stale.
        // In this case, all the mb-layers need to be removed and re-added.
        return true;
      }
    }

    return false;
  }

  syncLayerWithMB(mbMap: MbMap) {
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

  async getStyleMetaDescriptorFromLocalFeatures(): Promise<StyleMetaDescriptor | null> {
    const style = this.getCurrentStyle();
    if (!style) {
      return null;
    }

    const metaFromTiles = this._getMetaFromTiles();
    return await style.pluckStyleMetaFromTileMeta(metaFromTiles);
  }
}
