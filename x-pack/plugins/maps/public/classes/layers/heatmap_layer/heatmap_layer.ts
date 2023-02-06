/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap, VectorTileSource } from '@kbn/mapbox-gl';
import { AbstractLayer } from '../layer';
import { HeatmapStyle } from '../../styles/heatmap/heatmap_style';
import { LAYER_TYPE } from '../../../../common/constants';
import { HeatmapLayerDescriptor } from '../../../../common/descriptor_types';
import { ESGeoGridSource } from '../../sources/es_geo_grid_source';
import {
  NO_RESULTS_ICON_AND_TOOLTIPCONTENT,
  syncBoundsData,
  MvtSourceData,
  syncMvtSourceData,
} from '../vector_layer';
import { DataRequestContext } from '../../../actions';
import { buildVectorRequestMeta } from '../build_vector_request_meta';
import { IMvtVectorSource } from '../../sources/vector_source';
import { getAggsMeta } from '../../util/tile_meta_feature_utils';

export class HeatmapLayer extends AbstractLayer {
  private readonly _style: HeatmapStyle;

  static createDescriptor(options: Partial<HeatmapLayerDescriptor>) {
    const heatmapLayerDescriptor = super.createDescriptor(options);
    heatmapLayerDescriptor.type = LAYER_TYPE.HEATMAP;
    heatmapLayerDescriptor.style = HeatmapStyle.createDescriptor();
    return heatmapLayerDescriptor;
  }

  constructor({
    layerDescriptor,
    source,
  }: {
    layerDescriptor: HeatmapLayerDescriptor;
    source: ESGeoGridSource;
  }) {
    super({ layerDescriptor, source });
    if (!layerDescriptor.style) {
      const defaultStyle = HeatmapStyle.createDescriptor();
      this._style = new HeatmapStyle(defaultStyle);
    } else {
      this._style = new HeatmapStyle(layerDescriptor.style);
    }
  }

  getLayerIcon(isTocIcon: boolean) {
    const { docCount } = getAggsMeta(this._getMetaFromTiles());
    return docCount === 0 ? NO_RESULTS_ICON_AND_TOOLTIPCONTENT : super.getLayerIcon(isTocIcon);
  }

  getSource(): ESGeoGridSource {
    return super.getSource() as ESGeoGridSource;
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

  _getHeatmapLayerId() {
    return this.makeMbLayerId('heatmap');
  }

  getMbLayerIds() {
    return [this._getHeatmapLayerId()];
  }

  ownsMbLayerId(mbLayerId: string) {
    return this._getHeatmapLayerId() === mbLayerId;
  }

  ownsMbSourceId(mbSourceId: string) {
    return this.getId() === mbSourceId;
  }

  async syncData(syncContext: DataRequestContext) {
    await syncMvtSourceData({
      hasLabels: false,
      layerId: this.getId(),
      layerName: await this.getDisplayName(),
      prevDataRequest: this.getSourceDataRequest(),
      requestMeta: buildVectorRequestMeta(
        this.getSource(),
        this.getSource().getFieldNames(),
        syncContext.dataFilters,
        this.getQuery(),
        syncContext.isForceRefresh,
        syncContext.isFeatureEditorOpenForLayer
      ),
      source: this.getSource() as IMvtVectorSource,
      syncContext,
    });
  }

  _requiresPrevSourceCleanup(mbMap: MbMap): boolean {
    const mbSource = mbMap.getSource(this.getMbSourceId()) as VectorTileSource;
    if (!mbSource) {
      return false;
    }

    const sourceDataRequest = this.getSourceDataRequest();
    if (!sourceDataRequest) {
      return false;
    }
    const sourceData = sourceDataRequest.getData() as MvtSourceData | undefined;
    if (!sourceData) {
      return false;
    }

    return mbSource.tiles?.[0] !== sourceData.tileUrl;
  }

  syncLayerWithMB(mbMap: MbMap) {
    this._removeStaleMbSourcesAndLayers(mbMap);

    const sourceDataRequest = this.getSourceDataRequest();
    const sourceData = sourceDataRequest
      ? (sourceDataRequest.getData() as MvtSourceData)
      : undefined;
    if (!sourceData) {
      return;
    }

    const mbSourceId = this.getMbSourceId();
    const mbSource = mbMap.getSource(mbSourceId);
    if (!mbSource) {
      mbMap.addSource(mbSourceId, {
        type: 'vector',
        tiles: [sourceData.tileUrl],
        minzoom: sourceData.tileMinZoom,
        maxzoom: sourceData.tileMaxZoom,
      });
    }

    const heatmapLayerId = this._getHeatmapLayerId();
    if (!mbMap.getLayer(heatmapLayerId)) {
      mbMap.addLayer({
        id: heatmapLayerId,
        type: 'heatmap',
        source: mbSourceId,
        ['source-layer']: sourceData.tileSourceLayer,
        paint: {},
      });
    }

    const metricFields = this.getSource().getMetricFields();
    if (!metricFields.length) {
      return;
    }
    const metricField = metricFields[0];

    // do not use tile meta features from previous tile URL to avoid styling new tiles from previous tile meta features
    const tileMetaFeatures = this._requiresPrevSourceCleanup(mbMap) ? [] : this._getMetaFromTiles();
    let max = 0;
    for (let i = 0; i < tileMetaFeatures.length; i++) {
      const range = metricField.pluckRangeFromTileMetaFeature(tileMetaFeatures[i]);
      if (range) {
        max = Math.max(range.max, max);
      }
    }
    this.getCurrentStyle().setMBPaintProperties({
      mbMap,
      layerId: heatmapLayerId,
      propertyName: metricField.getMbFieldName(),
      max,
      resolution: this.getSource().getGridResolution(),
    });

    this.syncVisibilityWithMb(mbMap, heatmapLayerId);
    mbMap.setPaintProperty(heatmapLayerId, 'heatmap-opacity', this.getAlpha());
    mbMap.setLayerZoomRange(heatmapLayerId, this.getMinZoom(), this.getMaxZoom());
  }

  getLayerTypeIconName() {
    return 'heatmap';
  }

  async getFields() {
    return this.getSource().getFields();
  }

  async hasLegendDetails() {
    return true;
  }

  renderLegendDetails() {
    const metricFields = this.getSource().getMetricFields();
    return this.getCurrentStyle().renderLegendDetails(metricFields[0]);
  }

  async getBounds(getDataRequestContext: (layerId: string) => DataRequestContext) {
    return await syncBoundsData({
      layerId: this.getId(),
      syncContext: getDataRequestContext(this.getId()),
      source: this.getSource(),
      sourceQuery: this.getQuery(),
    });
  }

  async isFilteredByGlobalTime(): Promise<boolean> {
    return this.getSource().getApplyGlobalTime() && (await this.getSource().isTimeAware());
  }

  getIndexPatternIds() {
    return this.getSource().getIndexPatternIds();
  }

  getQueryableIndexPatternIds() {
    return this.getSource().getQueryableIndexPatternIds();
  }

  async getLicensedFeatures() {
    return await this.getSource().getLicensedFeatures();
  }
}
