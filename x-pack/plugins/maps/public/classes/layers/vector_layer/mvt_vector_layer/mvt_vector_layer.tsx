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
import { VectorStyle } from '../../../styles/vector/vector_style';
import { LAYER_TYPE, SOURCE_TYPES } from '../../../../../common/constants';
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
  VectorLayerDescriptor,
} from '../../../../../common/descriptor_types';
import { ESSearchSource } from '../../../sources/es_search_source';
import { LayerIcon } from '../../layer';
import { MvtSourceData, syncMvtSourceData } from './mvt_source_data';

export const ES_MVT_META_LAYER_NAME = 'meta';
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

  async syncData(syncContext: DataRequestContext) {
    if (this.getSource().getType() === SOURCE_TYPES.ES_SEARCH) {
      await this._syncMaxResultWindow(syncContext);
    }
    await this._syncSourceStyleMeta(syncContext, this.getSource(), this.getCurrentStyle());
    await this._syncSourceFormatters(syncContext, this.getSource(), this.getCurrentStyle());

    await syncMvtSourceData({
      layerId: this.getId(),
      prevDataRequest: this.getSourceDataRequest(),
      requestMeta: await this._getVectorSourceRequestMeta(
        syncContext.isForceRefresh,
        syncContext.dataFilters,
        this.getSource(),
        this.getCurrentStyle()
      ),
      source: this.getSource() as ITiledSingleLayerVectorSource,
      syncContext,
    });
  }

  _syncSourceBindingWithMb(mbMap: MbMap) {
    const mbSource = mbMap.getSource(this.getMbSourceId());
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

    const sourceData = sourceDataRequest.getData() as MvtSourceData | undefined;
    if (!sourceData) {
      return;
    }

    const mbSourceId = this.getMbSourceId();
    mbMap.addSource(mbSourceId, {
      type: 'vector',
      tiles: [sourceData.urlTemplate],
      minzoom: sourceData.minSourceZoom,
      maxzoom: sourceData.maxSourceZoom,
    });
  }

  getMbLayerIds() {
    return [...super.getMbLayerIds(), this._getMbTooManyFeaturesLayerId()];
  }

  ownsMbSourceId(mbSourceId: string): boolean {
    return this.getMbSourceId() === mbSourceId;
  }

  _getMbTooManyFeaturesLayerId() {
    return this.makeMbLayerId('toomanyfeatures');
  }

  _syncStylePropertiesWithMb(mbMap: MbMap) {
    // @ts-ignore
    const mbSource = mbMap.getSource(this.getMbSourceId());
    if (!mbSource) {
      return;
    }

    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return;
    }
    const sourceData = sourceDataRequest.getData() as MvtSourceData | undefined;
    if (!sourceData || sourceData.layerName === '') {
      return;
    }

    this._setMbLabelProperties(mbMap, sourceData.layerName);
    this._setMbPointsProperties(mbMap, sourceData.layerName);
    this._setMbLinePolygonProperties(mbMap, sourceData.layerName);
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

  _requiresPrevSourceCleanup(mbMap: MbMap): boolean {
    const mbSource = mbMap.getSource(this.getMbSourceId()) as MbVectorSource | MbGeoJSONSource;
    if (!mbSource) {
      return false;
    }
    if (!('tiles' in mbSource)) {
      // Expected source is not compatible, so remove.
      return true;
    }
    const mbTileSource = mbSource as MbVectorSource;

    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return false;
    }
    const sourceData = sourceDataRequest.getData() as MvtSourceData | undefined;
    if (!sourceData) {
      return false;
    }

    const isSourceDifferent =
      mbTileSource.tiles?.[0] !== sourceData.urlTemplate ||
      mbTileSource.minzoom !== sourceData.minSourceZoom ||
      mbTileSource.maxzoom !== sourceData.maxSourceZoom;

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
        mbLayer.sourceLayer !== sourceData.layerName &&
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
