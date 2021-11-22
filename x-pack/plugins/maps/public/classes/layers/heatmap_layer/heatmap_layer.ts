/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap, VectorSource as MbVectorSource } from '@kbn/mapbox-gl';
import { AbstractLayer } from '../layer';
import { HeatmapStyle } from '../../styles/heatmap/heatmap_style';
import { LAYER_TYPE } from '../../../../common/constants';
import { HeatmapLayerDescriptor } from '../../../../common/descriptor_types';
import { ESGeoGridSource } from '../../sources/es_geo_grid_source';
import { getVectorSourceBounds, MvtSourceData, syncMvtSourceData } from '../vector_layer';
import { DataRequestContext } from '../../../actions';
import { buildVectorRequestMeta } from '../build_vector_request_meta';
import { ITiledSingleLayerVectorSource } from '../../sources/tiled_single_layer_vector_source';

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

  destroy() {
    if (this.getSource()) {
      this.getSource().destroy();
    }
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
      layerId: this.getId(),
      prevDataRequest: this.getSourceDataRequest(),
      requestMeta: buildVectorRequestMeta(
        this.getSource(),
        this.getSource().getFieldNames(),
        syncContext.dataFilters,
        this.getQuery(),
        syncContext.isForceRefresh
      ),
      source: this.getSource() as ITiledSingleLayerVectorSource,
      syncContext,
    });
  }

  _requiresPrevSourceCleanup(mbMap: MbMap): boolean {
    const mbSource = mbMap.getSource(this.getMbSourceId()) as MbVectorSource;
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

    return mbSource.tiles?.[0] !== sourceData.urlTemplate;
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
        tiles: [sourceData.urlTemplate],
        minzoom: sourceData.minSourceZoom,
        maxzoom: sourceData.maxSourceZoom,
      });
    }

    const heatmapLayerId = this._getHeatmapLayerId();
    if (!mbMap.getLayer(heatmapLayerId)) {
      mbMap.addLayer({
        id: heatmapLayerId,
        type: 'heatmap',
        source: mbSourceId,
        ['source-layer']: sourceData.layerName,
        paint: {},
      });
    }

    const metricFields = this.getSource().getMetricFields();
    if (!metricFields.length) {
      return;
    }
    const metricField = metricFields[0];

    const tileMetaFeatures = this._getMetaFromTiles();
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

  async getBounds(syncContext: DataRequestContext) {
    return await getVectorSourceBounds({
      layerId: this.getId(),
      syncContext,
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
