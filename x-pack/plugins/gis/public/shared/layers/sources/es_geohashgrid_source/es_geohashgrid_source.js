/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uuid from 'uuid/v4';

import { VectorSource } from '../vector_source';
import { HeatmapLayer } from '../../heatmap_layer';
import { VectorLayer } from '../../vector_layer';
import { Schemas } from 'ui/vis/editors/default/schemas';
import {
  indexPatternService,
  fetchSearchSourceAndRecordWithInspector,
  inspectorAdapters,
  SearchSource,
  timeService,
} from '../../../../kibana_services';
import { createExtentFilter, makeGeohashGridPolygon } from '../../../../elasticsearch_geo_utils';
import { AggConfigs } from 'ui/vis/agg_configs';
import { tabifyAggResponse } from 'ui/agg_response/tabify';
import { convertToGeoJson } from 'ui/vis/map/convert_to_geojson';
import { ESSourceDetails } from '../../../components/es_source_details';
import { ZOOM_TO_PRECISION } from '../../../utils/zoom_to_precision';
import { VectorStyle } from '../../styles/vector_style';
import { RENDER_AS } from './render_as';
import { CreateSourceEditor } from './create_source_editor';

const aggSchemas = new Schemas([
  {
    group: 'metrics',
    name: 'metric',
    title: 'Value',
    min: 1,
    max: 1,  // TODO add support for multiple metric aggregations - convertToGeoJson will need to be tweeked
    aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'top_hits'],
    defaults: [
      { schema: 'metric', type: 'count' }
    ]
  },
  {
    group: 'buckets',
    name: 'segment',
    title: 'Geo Coordinates',
    aggFilter: 'geohash_grid',
    min: 1,
    max: 1
  }
]);

export class ESGeohashGridSource extends VectorSource {

  static type = 'ES_GEOHASH_GRID';
  static typeDisplayName = 'Elasticsearch geohash aggregation';

  static createDescriptor({ indexPatternId, geoField, requestType }) {
    return {
      type: ESGeohashGridSource.type,
      id: uuid(),
      indexPatternId: indexPatternId,
      geoField: geoField,
      requestType: requestType
    };
  }

  static renderEditor({ onPreviewSource }) {
    const onSelect = (sourceConfig) => {
      const sourceDescriptor = ESGeohashGridSource.createDescriptor(sourceConfig);
      const source = new ESGeohashGridSource(sourceDescriptor);
      onPreviewSource(source);
    };

    return (<CreateSourceEditor onSelect={onSelect}/>);
  }

  renderDetails() {
    return (
      <ESSourceDetails
        source={this}
        geoField={this._descriptor.geoField}
        geoFieldType="Point field"
        sourceType={ESGeohashGridSource.typeDisplayName}
      />
    );
  }

  destroy() {
    inspectorAdapters.requests.resetRequest(this._descriptor.id);
  }

  async getGeoJsonWithMeta({ layerName }, searchFilters) {
    let targetPrecision = ZOOM_TO_PRECISION[Math.round(searchFilters.zoom)];
    targetPrecision += 0;//should have refinement param, similar to heatmap style
    const featureCollection = await this.getGeoJsonPointsWithTotalCount({
      precision: targetPrecision,
      extent: searchFilters.buffer,
      timeFilters: searchFilters.timeFilters,
      layerName,
    });

    if (this._descriptor.requestType === RENDER_AS.GRID) {
      featureCollection.features.forEach((feature) => {
        //replace geometries with the polygon
        feature.geometry = makeGeohashGridPolygon(feature);
      });
    }

    featureCollection.features.forEach((feature) => {
      //give this some meaningful name
      feature.properties.doc_count = feature.properties.value;
      delete feature.properties.value;
    });

    return {
      data: featureCollection,
      meta: {
        areResultsTrimmed: true
      }
    };
  }

  async getNumberFields() {
    return ['doc_count'];
  }

  async getGeoJsonPointsWithTotalCount({ precision, extent, timeFilters, layerName }) {

    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(this._descriptor.indexPatternId);
    } catch (error) {
      throw new Error(`Unable to find Index pattern ${this._descriptor.indexPatternId}`);
    }

    const geoField = indexPattern.fields.byName[this._descriptor.geoField];
    if (!geoField) {
      throw new Error(`Index pattern ${indexPattern.title} no longer contains the geo field ${this._descriptor.geoField}`);
    }

    const aggConfigs = new AggConfigs(indexPattern, this._makeAggConfigs(precision), aggSchemas.all);

    let resp;
    try {
      const searchSource = new SearchSource();
      searchSource.setField('index', indexPattern);
      searchSource.setField('size', 0);
      searchSource.setField('aggs', aggConfigs.toDsl());
      searchSource.setField('filter', () => {
        const filters = [];
        filters.push(createExtentFilter(extent, geoField.name, geoField.type));
        filters.push(timeService.createFilter(indexPattern, timeFilters));
        return filters;
      });

      resp = await fetchSearchSourceAndRecordWithInspector({
        searchSource,
        requestName: layerName,
        requestId: this._descriptor.id,
        requestDesc: 'Elasticsearch geohash_grid aggregation request'
      });
    } catch(error) {
      throw new Error(`Elasticsearch search request failed, error: ${error.message}`);
    }

    const tabifiedResp = tabifyAggResponse(aggConfigs, resp);
    const { featureCollection } = convertToGeoJson(tabifiedResp);

    return featureCollection;
  }

  async isTimeAware() {
    const indexPattern = await this._getIndexPattern();
    const timeField = indexPattern.timeFieldName;
    return !!timeField;
  }

  isFilterByMapBounds() {
    return true;
  }

  async _getIndexPattern() {
    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(this._descriptor.indexPatternId);
    } catch (error) {
      throw new Error(`Unable to find Index pattern ${this._descriptor.indexPatternId}`);
    }
    return indexPattern;
  }

  _makeAggConfigs(precision) {
    return [
      // TODO allow user to configure metric(s) aggregations
      {
        id: '1',
        enabled: true,
        type: 'count',
        schema: 'metric',
        params: {}
      },
      {
        id: '2',
        enabled: true,
        type: 'geohash_grid',
        schema: 'segment',
        params: {
          field: this._descriptor.geoField,
          isFilteredByCollar: false, // map extent filter is in query so no need to filter in aggregation
          useGeocentroid: true, // TODO make configurable
          autoPrecision: false, // false so we can define our own precision levels based on styling
          precision: precision,
        }
      }
    ];
  }

  _createDefaultLayerDescriptor(options) {
    if (this._descriptor.requestType === RENDER_AS.HEATMAP) {
      return HeatmapLayer.createDescriptor({
        sourceDescriptor: this._descriptor,
        ...options
      });
    }

    const descriptor = VectorLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options
    });
    descriptor.style = {
      ...descriptor.style,
      "type": "VECTOR",
      "properties": {
        "fillColor": {
          "type": "DYNAMIC",
          "options": {
            "field": {
              "label": "doc_count",
              "name": "doc_count",
              "origin": "source"
            },
            "color": "Blues"
          }
        },
        "lineColor": {
          "type": "STATIC",
          "options": {
            "color": "#cccccc"
          }
        },
        "lineWidth": {
          "type": "STATIC",
          "options": {
            "size": 1
          }
        },
        "iconSize": {
          "type": "STATIC",
          "options": {
            "size": 10
          }
        },
        "alphaValue": 1
      }
    };
    return descriptor;
  }

  createDefaultLayer(options) {
    if (this._descriptor.requestType === RENDER_AS.HEATMAP) {
      return new HeatmapLayer({
        layerDescriptor: this._createDefaultLayerDescriptor(options),
        source: this
      });
    }

    const layerDescriptor = this._createDefaultLayerDescriptor(options);
    const style = new VectorStyle(layerDescriptor.style);
    return new VectorLayer({
      layerDescriptor: layerDescriptor,
      source: this,
      style: style
    });
  }

  async getDisplayName() {
    const indexPattern = await this._getIndexPattern();
    return indexPattern.title;
  }
}
