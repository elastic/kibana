/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Map as MbMap, GeoJSONSource as MbGeoJSONSource } from 'mapbox-gl';
import { FeatureCollection } from 'geojson';
import { AbstractLayer } from '../layer';
import { HeatmapStyle } from '../../styles/heatmap/heatmap_style';
import { EMPTY_FEATURE_COLLECTION, LAYER_TYPE } from '../../../../common/constants';
import { HeatmapLayerDescriptor, MapQuery } from '../../../../common/descriptor_types';
import { ESGeoGridSource } from '../../sources/es_geo_grid_source';
import { addGeoJsonMbSource, syncVectorSource } from '../vector_layer';
import { DataRequestContext } from '../../../actions';
import { DataRequestAbortError } from '../../util/data_request';

const SCALED_PROPERTY_NAME = '__kbn_heatmap_weight__'; // unique name to store scaled value for weighting

export class HeatmapLayer extends AbstractLayer {
  static type = LAYER_TYPE.HEATMAP;

  private readonly _style: HeatmapStyle;

  static createDescriptor(options: Partial<HeatmapLayerDescriptor>) {
    const heatmapLayerDescriptor = super.createDescriptor(options);
    heatmapLayerDescriptor.type = HeatmapLayer.type;
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

  _getPropKeyOfSelectedMetric() {
    const metricfields = this.getSource().getMetricFields();
    return metricfields[0].getName();
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
    if (this.isLoadingBounds()) {
      return;
    }

    const sourceQuery = this.getQuery() as MapQuery;
    try {
      await syncVectorSource({
        layerId: this.getId(),
        layerName: await this.getDisplayName(this.getSource()),
        prevDataRequest: this.getSourceDataRequest(),
        requestMeta: {
          ...syncContext.dataFilters,
          fieldNames: this.getSource().getFieldNames(),
          geogridPrecision: this.getSource().getGeoGridPrecision(syncContext.dataFilters.zoom),
          sourceQuery: sourceQuery ? sourceQuery : undefined,
          applyGlobalQuery: this.getSource().getApplyGlobalQuery(),
          applyGlobalTime: this.getSource().getApplyGlobalTime(),
          sourceMeta: this.getSource().getSyncMeta(),
        },
        syncContext,
        source: this.getSource(),
      });
    } catch (error) {
      if (!(error instanceof DataRequestAbortError)) {
        throw error;
      }
    }
  }

  syncLayerWithMB(mbMap: MbMap) {
    addGeoJsonMbSource(this._getMbSourceId(), this.getMbLayerIds(), mbMap);

    const heatmapLayerId = this._getHeatmapLayerId();
    if (!mbMap.getLayer(heatmapLayerId)) {
      mbMap.addLayer({
        id: heatmapLayerId,
        type: 'heatmap',
        source: this.getId(),
        paint: {},
      });
    }

    const mbGeoJSONSource = mbMap.getSource(this.getId()) as MbGeoJSONSource;
    const sourceDataRequest = this.getSourceDataRequest();
    const featureCollection = sourceDataRequest
      ? (sourceDataRequest.getData() as FeatureCollection)
      : null;
    if (!featureCollection) {
      mbGeoJSONSource.setData(EMPTY_FEATURE_COLLECTION);
      return;
    }

    const propertyKey = this._getPropKeyOfSelectedMetric();
    const dataBoundToMap = AbstractLayer.getBoundDataForSource(mbMap, this.getId());
    if (featureCollection !== dataBoundToMap) {
      let max = 1; // max will be at least one, since counts or sums will be at least one.
      for (let i = 0; i < featureCollection.features.length; i++) {
        max = Math.max(featureCollection.features[i].properties?.[propertyKey], max);
      }
      for (let i = 0; i < featureCollection.features.length; i++) {
        if (featureCollection.features[i].properties) {
          featureCollection.features[i].properties![SCALED_PROPERTY_NAME] =
            featureCollection.features[i].properties![propertyKey] / max;
        }
      }
      mbGeoJSONSource.setData(featureCollection);
    }

    this.syncVisibilityWithMb(mbMap, heatmapLayerId);
    this.getCurrentStyle().setMBPaintProperties({
      mbMap,
      layerId: heatmapLayerId,
      propertyName: SCALED_PROPERTY_NAME,
      resolution: this.getSource().getGridResolution(),
    });
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
}
