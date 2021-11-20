/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Map as MbMap,
  AnyLayer as MbLayer,
  GeoJSONSource as MbGeoJSONSource,
  VectorSource as MbVectorSource,
} from '@kbn/mapbox-gl';
import { Feature } from 'geojson';
import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import { parse as parseUrl } from 'url';
import { IVectorStyle, VectorStyle } from '../../../styles/vector/vector_style';
import { LAYER_TYPE, SOURCE_DATA_REQUEST_ID, SOURCE_TYPES } from '../../../../../common/constants';
import {
  NO_RESULTS_ICON_AND_TOOLTIPCONTENT,
  AbstractVectorLayer,
  VectorLayerArguments,
} from '../vector_layer';
import { ITiledSingleLayerVectorSource } from '../../../sources/tiled_single_layer_vector_source';
import { DataRequestContext } from '../../../../actions';
import {
  StyleMetaDescriptor,
  TileMetaFeature,
  Timeslice,
  VectorLayerDescriptor,
  VectorSourceRequestMeta,
} from '../../../../../common/descriptor_types';
import { MVTSingleLayerVectorSourceConfig } from '../../../sources/mvt_single_layer_vector_source/types';
import { ESSearchSource } from '../../../sources/es_search_source';
import { canSkipSourceUpdate } from '../../../util/can_skip_fetch';
import { LayerIcon } from '../../layer';

const ES_MVT_META_LAYER_NAME = 'meta';
const ES_MVT_HITS_TOTAL_RELATION = 'hits.total.relation';
const ES_MVT_HITS_TOTAL_VALUE = 'hits.total.value';
const MAX_RESULT_WINDOW_DATA_REQUEST_ID = 'maxResultWindow';

export class MvtVectorLayer extends AbstractVectorLayer {
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

  getFeatureId(feature: Feature): string | number | undefined {
    if (!this.getSource().isESSource()) {
      return feature.id;
    }

    return this.getSource().getType() === SOURCE_TYPES.ES_SEARCH
      ? feature.properties?._id
      : feature.properties?._key;
  }

  _getMetaFromTiles(): TileMetaFeature[] {
    return this._descriptor.__metaFromTiles || [];
  }

  getLayerIcon(isTocIcon: boolean): LayerIcon {
    if (!this.getSource().isESSource()) {
      // Only ES-sources can have a special meta-tile, not 3rd party vector tile sources
      return {
        icon: this.getCurrentStyle().getIcon(false),
        tooltipContent: null,
        areResultsTrimmed: false,
      };
    }

    //
    // TODO ES MVT specific - move to es_tiled_vector_layer implementation
    //

    const tileMetaFeatures = this._getMetaFromTiles();
    if (!tileMetaFeatures.length) {
      return NO_RESULTS_ICON_AND_TOOLTIPCONTENT;
    }

    if (this.getSource().getType() !== SOURCE_TYPES.ES_SEARCH) {
      // aggregation ES sources are never trimmed
      return {
        icon: this.getCurrentStyle().getIcon(false),
        tooltipContent: null,
        areResultsTrimmed: false,
      };
    }

    const maxResultWindow = this._getMaxResultWindow();
    if (maxResultWindow === undefined) {
      return {
        icon: this.getCurrentStyle().getIcon(false),
        tooltipContent: null,
        areResultsTrimmed: false,
      };
    }

    const totalFeaturesCount: number = tileMetaFeatures.reduce((acc: number, tileMeta: Feature) => {
      const count =
        tileMeta && tileMeta.properties ? tileMeta.properties[ES_MVT_HITS_TOTAL_VALUE] : 0;
      return count + acc;
    }, 0);

    if (totalFeaturesCount === 0) {
      return NO_RESULTS_ICON_AND_TOOLTIPCONTENT;
    }

    const areResultsTrimmed: boolean = tileMetaFeatures.some((tileMeta: TileMetaFeature) => {
      if (tileMeta?.properties?.[ES_MVT_HITS_TOTAL_RELATION] === 'gte') {
        return tileMeta?.properties?.[ES_MVT_HITS_TOTAL_VALUE] >= maxResultWindow + 1;
      } else {
        return false;
      }
    });

    return {
      icon: this.getCurrentStyle().getIcon(isTocIcon && areResultsTrimmed),
      tooltipContent: areResultsTrimmed
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
      areResultsTrimmed,
    };
  }

  _getMaxResultWindow(): number | undefined {
    const dataRequest = this.getDataRequest(MAX_RESULT_WINDOW_DATA_REQUEST_ID);
    if (!dataRequest) {
      return;
    }
    const data = dataRequest.getData() as { maxResultWindow: number } | undefined;
    return data ? data.maxResultWindow : undefined;
  }

  async _syncMaxResultWindow({ startLoading, stopLoading }: DataRequestContext) {
    const prevDataRequest = this.getDataRequest(MAX_RESULT_WINDOW_DATA_REQUEST_ID);
    if (prevDataRequest) {
      return;
    }

    const requestToken = Symbol(`${this.getId()}-${MAX_RESULT_WINDOW_DATA_REQUEST_ID}`);
    startLoading(MAX_RESULT_WINDOW_DATA_REQUEST_ID, requestToken);
    const maxResultWindow = await (this.getSource() as ESSearchSource).getMaxResultWindow();
    stopLoading(MAX_RESULT_WINDOW_DATA_REQUEST_ID, requestToken, { maxResultWindow });
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
    if (this.getSource().getType() === SOURCE_TYPES.ES_SEARCH) {
      await this._syncMaxResultWindow(syncContext);
    }
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

  getMbLayerIds() {
    return [...super.getMbLayerIds(), this._getMbTooManyFeaturesLayerId()];
  }

  ownsMbSourceId(mbSourceId: string): boolean {
    return this._getMbSourceId() === mbSourceId;
  }

  _getMbTooManyFeaturesLayerId() {
    return this.makeMbLayerId('toomanyfeatures');
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

    this._setMbLabelProperties(mbMap, sourceMeta.layerName);
    this._setMbPointsProperties(mbMap, sourceMeta.layerName);
    this._setMbLinePolygonProperties(mbMap, sourceMeta.layerName);
    this._syncTooManyFeaturesProperties(mbMap);
  }

  // TODO ES MVT specific - move to es_tiled_vector_layer implementation
  _syncTooManyFeaturesProperties(mbMap: MbMap) {
    if (this.getSource().getType() !== SOURCE_TYPES.ES_SEARCH) {
      return;
    }

    const maxResultWindow = this._getMaxResultWindow();
    if (maxResultWindow === undefined) {
      return;
    }

    const tooManyFeaturesLayerId = this._getMbTooManyFeaturesLayerId();

    if (!mbMap.getLayer(tooManyFeaturesLayerId)) {
      const mbTooManyFeaturesLayer: MbLayer = {
        id: tooManyFeaturesLayerId,
        type: 'line',
        source: this.getId(),
        paint: {},
      };
      mbTooManyFeaturesLayer['source-layer'] = ES_MVT_META_LAYER_NAME;
      mbMap.addLayer(mbTooManyFeaturesLayer);
      mbMap.setFilter(tooManyFeaturesLayerId, [
        'all',
        ['==', ['get', ES_MVT_HITS_TOTAL_RELATION], 'gte'],
        ['>=', ['get', ES_MVT_HITS_TOTAL_VALUE], maxResultWindow + 1],
      ]);
      mbMap.setPaintProperty(
        tooManyFeaturesLayerId,
        'line-color',
        this.getCurrentStyle().getPrimaryColor()
      );
      mbMap.setPaintProperty(tooManyFeaturesLayerId, 'line-width', 3);
      mbMap.setPaintProperty(tooManyFeaturesLayerId, 'line-dasharray', [2, 1]);
      mbMap.setPaintProperty(tooManyFeaturesLayerId, 'line-opacity', this.getAlpha());
    }

    this.syncVisibilityWithMb(mbMap, tooManyFeaturesLayerId);
    mbMap.setLayerZoomRange(tooManyFeaturesLayerId, this.getMinZoom(), this.getMaxZoom());
  }

  queryTileMetaFeatures(mbMap: MbMap): TileMetaFeature[] | null {
    if (!this.getSource().isESSource()) {
      return null;
    }

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
      sourceLayer: ES_MVT_META_LAYER_NAME,
    });

    const metaFeatures: Array<TileMetaFeature | null> = (
      mbFeatures as unknown as TileMetaFeature[]
    ).map((mbFeature: TileMetaFeature | null) => {
      const parsedProperties: Record<string, unknown> = {};
      for (const key in mbFeature?.properties) {
        if (mbFeature?.properties.hasOwnProperty(key)) {
          parsedProperties[key] =
            typeof mbFeature.properties[key] === 'string' ||
            typeof mbFeature.properties[key] === 'number' ||
            typeof mbFeature.properties[key] === 'boolean'
              ? mbFeature.properties[key]
              : JSON.parse(mbFeature.properties[key]); // mvt properties cannot be nested geojson
        }
      }

      try {
        return {
          type: 'Feature',
          id: mbFeature?.id,
          geometry: mbFeature?.geometry, // this getter might throw with non-conforming geometries
          properties: parsedProperties,
        } as TileMetaFeature;
      } catch (e) {
        return null;
      }
    });

    const filtered = metaFeatures.filter((f) => f !== null);
    return filtered as TileMetaFeature[];
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
      if (
        mbLayer &&
        // @ts-expect-error
        mbLayer.sourceLayer !== tiledSourceMeta.layerName &&
        // @ts-expect-error
        mbLayer.sourceLayer !== ES_MVT_META_LAYER_NAME
      ) {
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
    return await this.getCurrentStyle().pluckStyleMetaFromTileMeta(this._getMetaFromTiles());
  }
}
