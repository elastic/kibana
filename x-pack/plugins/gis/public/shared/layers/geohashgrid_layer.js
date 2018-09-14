/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer } from './layer';
import { HeatmapStyle } from './styles/heatmap_style';
import { endDataLoad, startDataLoad } from '../../actions/store_actions';
import turf from 'turf';
import turfBooleanContains from '@turf/boolean-contains';


window._turf = turf;
window._turfBooleanContains = turf;

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
    return heatmapLayerDescriptor;
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
        paint: {//needs tweaking
          "heatmap-radius": 64,
          "heatmap-weight": {
            "type": "identity",
            "property": "__kbn_heatmap_weight__"
          }
        }
      });
    }

    //todo: similar problem as OL here. keeping track of data via MB source directly
    const mbSourceAfter = mbMap.getSource(this.getId());
    if (!this._descriptor.data) {
      mbSourceAfter.setData({ 'type': 'FeatureCollection', 'features': [] });
      return;
    }

    if (this._descriptor.data !== mbSourceAfter._data) {
      let max = 0;
      for (let i = 0; i < this._descriptor.data.features.length; i++) {
        max = Math.max(this._descriptor.data.features[i].properties.doc_count, max);
      }
      for (let i = 0; i < this._descriptor.data.features.length; i++) {
        this._descriptor.data.features[i].properties.__kbn_heatmap_weight__ = this._descriptor.data.features[i].properties.doc_count / max;
      }
      mbSourceAfter.setData(this._descriptor.data);
    }

    mbMap.setLayoutProperty(heatmapLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');

  }


  isLayerLoading() {
    return !!this._descriptor.dataDirty;
  }

  async syncDataToMapState(mapState, requestToken, dispatch) {
    const targetPrecision = ZOOM_TO_PRECISION[Math.round(mapState.zoom)];
    if (this._descriptor.dataMeta && this._descriptor.dataMeta.extent) {
      const dataExtent = turf.bboxPolygon(this._descriptor.dataMeta.extent);
      const mapStateExtent = turf.bboxPolygon(mapState.extent);
      const isContained = turfBooleanContains(dataExtent, mapStateExtent);
      // const isContained = ol.extent.containsExtent(this._descriptor.dataMeta.extent, mapState.extent);
      const samePrecision = this._descriptor.dataMeta.precision === targetPrecision;
      if (samePrecision && isContained) {
        return;
      }
    }
    return this._fetchNewData(mapState, requestToken, targetPrecision, dispatch);
  }


  async _fetchNewData(mapState, requestToken, precision, dispatch) {
    const scaleFactor = 0.5;
    const width = mapState.extent[2] - mapState.extent[0];
    const height = mapState.extent[3] - mapState.extent[1];
    const expandExtent = [
      mapState.extent[0] - width * scaleFactor,
      mapState.extent[1] - height * scaleFactor,
      mapState.extent[2] + width * scaleFactor,
      mapState.extent[3] + height * scaleFactor
    ];

    dispatch(startDataLoad(this.getId(), {
      mapState: mapState,
      precision: precision,
      extent: expandExtent
    }, requestToken));
    const data = await this._source.getGeoJsonPointsWithTotalCount(precision, expandExtent);
    dispatch(endDataLoad(this.getId(), data, requestToken));
  }

}
