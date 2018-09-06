/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALayer } from './layer';
import { HeatmapStyle } from './styles/heatmap_style';
import * as ol from 'openlayers';
import { endDataLoad, startDataLoad } from '../../actions/store_actions';
import { OL_GEOJSON_FORMAT } from '../ol_layer_defaults';


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

  getCurrentStyle() {
    //todo
    return new HeatmapStyle(this._descriptor.style);
  }

  _createCorrespondingOLLayer() {
    const vectorModel = new ol.source.Vector({});
    const placeHolderLayer = new ol.layer.Heatmap({
      source: vectorModel,
      weight: '__kbn_heatmap_weight__',
      radius: 16
    });
    placeHolderLayer.setVisible(this.isVisible());
    return placeHolderLayer;
  }

  _syncOLWithCurrentDataAsVectors(olLayer) {

    if (!this._descriptor.data) {
      return;
    }
    //ugly, but it's what we have now
    //think about stateful-shim that mirrors OL (or Mb) that can keep these links
    //but for now, the OpenLayers object model remains our source of truth
    if (this._descriptor.data === olLayer.__kbn_data__) {
      return;
    } else {
      olLayer.__kbn_data__ = this._descriptor.data;
    }

    //add a tmp field with the weights
    //todo: there's a lot of assumptions baked in here. Needs to be configurable
    let max = 0;
    for (let i = 0; i < olLayer.__kbn_data__.features.length; i++) {
      max = Math.max(olLayer.__kbn_data__.features[i].properties.doc_count, max);
    }
    for (let i = 0; i < olLayer.__kbn_data__.features.length; i++) {
      olLayer.__kbn_data__.features[i].properties.__kbn_heatmap_weight__ = olLayer.__kbn_data__.features[i].properties.doc_count / max;
    }

    const olSource = olLayer.getSource();
    olSource.clear();
    const olFeatures = OL_GEOJSON_FORMAT.readFeatures(this._descriptor.data);
    olSource.addFeatures(olFeatures);
  }

  _syncOLData(olLayer) {
    return this._syncOLWithCurrentDataAsVectors(olLayer);
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

  isLayerLoading() {
    return !!this._descriptor.dataDirty;
  }

  async syncDataToMapState(mapState, requestToken, dispatch) {
    const targetPrecision = ZOOM_TO_PRECISION[Math.round(mapState.zoom)];
    if (this._descriptor.dataMeta && this._descriptor.dataMeta.extent) {
      const isContained = ol.extent.containsExtent(this._descriptor.dataMeta.extent, mapState.extent);
      const samePrecision = this._descriptor.dataMeta.precision === targetPrecision;
      if (samePrecision && isContained) {
        return;
      }
    }
    return this._fetchNewData(mapState, requestToken, targetPrecision, dispatch);
  }
}
