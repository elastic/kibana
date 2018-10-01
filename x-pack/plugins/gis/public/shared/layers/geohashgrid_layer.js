/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer } from './layer';
import { HeatmapStyle } from './styles/heatmap_style';
import turf from 'turf';
import turfBooleanContains from '@turf/boolean-contains';

const ZOOM_TO_PRECISION = {
  "0": 1,
  "1": 2,
  "2": 2,
  "3": 2,
  "4": 3,
  "5": 3,
  "6": 4,
  "7": 4,
  "8": 4,
  "9": 5,
  "10": 5,
  "11": 6,
  "12": 6,
  "13": 6,
  "14": 7,
  "15": 7,
  "16": 8,
  "17": 8,
  "18": 8,
  "19": 9,
  "20": 9,
  "21": 10,
  "22": 10,
  "23": 10,
  "24": 11,
  "25": 11,
  "26": 12,
  "27": 12,
  "28": 12,
  "29": 12,
  "30": 12
};

export class GeohashGridLayer extends ALayer {

  static type = "GEOHASH_GRID";

  static createDescriptor(options) {
    const heatmapLayerDescriptor = super.createDescriptor(options);
    heatmapLayerDescriptor.type = GeohashGridLayer.type;
    const defaultStyle = HeatmapStyle.createDescriptor('coarse');
    heatmapLayerDescriptor.style = defaultStyle;
    return heatmapLayerDescriptor;
  }

  constructor({ layerDescriptor, source, style }) {
    super({ layerDescriptor, source, style });
    if (!style) {
      const defaultStyle = HeatmapStyle.createDescriptor('coarse');
      this._style = new HeatmapStyle(defaultStyle);
    }
  }

  getSupportedStyles() {
    return [HeatmapStyle];
  }

  syncLayerWithMB(mbMap) {

    const mbSource = mbMap.getSource(this.getId());
    const heatmapLayerId = this.getId() + '_heatmap';

    if (!mbSource) {
      mbMap.addSource(this.getId(), {
        type: 'geojson',
        data: { 'type': 'FeatureCollection', 'features': [] }
      });


      mbMap.addLayer({
        id: heatmapLayerId,
        type: 'heatmap',
        source: this.getId(),
        paint: {}
      });
    }

    //todo: similar problem as OL here. keeping track of data via MB source directly
    const mbSourceAfter = mbMap.getSource(this.getId());
    if (!this._descriptor.data) {
      mbSourceAfter.setData({ 'type': 'FeatureCollection', 'features': [] });
      return;
    }

    const scaledPropertyName = '__kbn_heatmap_weight__';
    if (this._descriptor.data !== mbSourceAfter._data) {
      let max = 0;
      for (let i = 0; i < this._descriptor.data.features.length; i++) {
        max = Math.max(this._descriptor.data.features[i].properties.doc_count, max);
      }
      for (let i = 0; i < this._descriptor.data.features.length; i++) {
        this._descriptor.data.features[i].properties[scaledPropertyName] = this._descriptor.data.features[i].properties.doc_count / max;
      }
      mbSourceAfter.setData(this._descriptor.data);
    }

    mbMap.setLayoutProperty(heatmapLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    this._style.setMBPaintProperties(mbMap, heatmapLayerId, scaledPropertyName);
    if (!this._descriptor.showAtAllZoomLevels) {
      mbMap.setLayerZoomRange(heatmapLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
    }
  }


  isLayerLoading() {
    return !!this._descriptor.dataDirty;
  }

  async syncData({ startLoading, stopLoading, onLoadError, dataFilters }) {
    if (!this.isVisible() || !this.showAtZoomLevel(dataFilters.zoom)) {
      return;
    }

    if (!dataFilters.extent) {
      return;
    }

    const targetPrecision = ZOOM_TO_PRECISION[Math.round(dataFilters.zoom)] + this._style.getPrecisionRefinementDelta();

    let samePrecision = false;
    let isContained = false;
    let sameTime = false;
    if (this._descriptor.dataMeta) {
      if (this._descriptor.dataMeta.extent) {
        const dataExtent = turf.bboxPolygon([
          this._descriptor.dataMeta.extent.min_lon,
          this._descriptor.dataMeta.extent.min_lat,
          this._descriptor.dataMeta.extent.max_lon,
          this._descriptor.dataMeta.extent.max_lat,
        ]);
        const mapStateExtent = turf.bboxPolygon([
          dataFilters.extent.min_lon,
          dataFilters.extent.min_lat,
          dataFilters.extent.max_lon,
          dataFilters.extent.max_lat
        ]);

        isContained = turfBooleanContains(dataExtent, mapStateExtent);
        samePrecision = this._descriptor.dataMeta.precision === targetPrecision;
      }
      if (this._descriptor.dataMeta.timeFilters) {
        sameTime = dataFilters.timeFilters === this._descriptor.dataMeta.timeFilters;
      }
    }
    if (samePrecision && isContained && sameTime) {
      return;
    }

    const extent = dataFilters.extent;
    const width = extent.max_lon - extent.min_lon;
    const height = extent.max_lat - extent.min_lat;
    const scaleFactor = 0.5;
    const expandExtent = {
      min_lon: extent.min_lon - width * scaleFactor,
      min_lat: extent.min_lat - height * scaleFactor,
      max_lon: extent.max_lon + width * scaleFactor,
      max_lat: extent.max_lat + height * scaleFactor
    };

    const dataMeta = {
      ...dataFilters,
      extent: expandExtent,
      precision: targetPrecision
    };
    return this._fetchNewData({ startLoading, stopLoading, onLoadError, dataMeta });
  }

  async _fetchNewData({ startLoading, stopLoading, onLoadError, dataMeta }) {
    const { precision, timeFilters, extent } = dataMeta;
    startLoading(dataMeta);
    try {
      const data = await this._source.getGeoJsonPointsWithTotalCount(
        precision, extent, timeFilters);
      stopLoading(data);
    } catch(error) {
      onLoadError(error.message);
    }
  }
}
