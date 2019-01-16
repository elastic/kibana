/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import uuid from 'uuid/v4';

import { AbstractESSource } from '../es_source';
import { HeatmapLayer } from '../../heatmap_layer';
import { VectorLayer } from '../../vector_layer';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { makeGeohashGridPolygon } from '../../../../elasticsearch_geo_utils';
import { AggConfigs } from 'ui/vis/agg_configs';
import { tabifyAggResponse } from 'ui/agg_response/tabify';
import { convertToGeoJson } from './convert_to_geojson';
import { ESSourceDetails } from '../../../components/es_source_details';
import { ZOOM_TO_PRECISION } from '../../../utils/zoom_to_precision';
import { VectorStyle } from '../../styles/vector_style';
import { RENDER_AS } from './render_as';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';

const COUNT_PROP_LABEL = 'Count';
const COUNT_PROP_NAME = 'doc_count';

const aggSchemas = new Schemas([
  {
    group: 'metrics',
    name: 'metric',
    title: 'Value',
    min: 1,
    max: Infinity,
    aggFilter: ['avg', 'count', 'max', 'min', 'sum'],
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

export class ESGeohashGridSource extends AbstractESSource {

  static type = 'ES_GEOHASH_GRID';
  static title = 'Elasticsearch geohash aggregation';
  static description = 'Group geospatial data in grids with metrics for each gridded cell';

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

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        indexPatternId={this._descriptor.indexPatternId}
        onChange={onChange}
        metrics={this._descriptor.metrics}
        renderAs={this._descriptor.requestType}
      />
    );
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

  async getGeoJsonWithMeta({ layerName }, searchFilters) {
    let targetPrecision = ZOOM_TO_PRECISION[Math.round(searchFilters.zoom)];
    targetPrecision += 0;//should have refinement param, similar to heatmap style
    const featureCollection = await this.getGeoJsonPoints({ layerName }, {
      precision: targetPrecision,
      buffer: searchFilters.buffer,
      timeFilters: searchFilters.timeFilters,
      query: searchFilters.query,
    });

    if (this._descriptor.requestType === RENDER_AS.GRID) {
      featureCollection.features.forEach((feature) => {
        //replace geometries with the polygon
        feature.geometry = makeGeohashGridPolygon(feature);
      });
    }

    return {
      data: featureCollection,
      meta: {
        areResultsTrimmed: true
      }
    };
  }

  getFieldNames() {
    return this.getMetricFields().map(({ propertyKey }) => {
      return propertyKey;
    });
  }

  async getNumberFields() {
    return this.getMetricFields().map(({ propertyKey: name, propertyLabel: label }) => {
      return { label, name };
    });
  }


  async getGeoJsonPoints({ layerName }, { precision, buffer, timeFilters, query }) {

    const indexPattern = await this._getIndexPattern();
    const searchSource  = await this._makeSearchSource({ buffer, timeFilters, query }, 0);
    const aggConfigs = new AggConfigs(indexPattern, this._makeAggConfigs(precision), aggSchemas.all);
    searchSource.setField('aggs', aggConfigs.toDsl());
    const esResponse = await this._runEsQuery(layerName, searchSource, 'Elasticsearch geohash_grid aggregation request');

    const tabifiedResp = tabifyAggResponse(aggConfigs, esResponse);
    const { featureCollection } = convertToGeoJson(tabifiedResp);

    return featureCollection;
  }

  isFilterByMapBounds() {
    return true;
  }


  _getValidMetrics() {
    const metrics = _.get(this._descriptor, 'metrics', []).filter(({ type, field }) => {
      if (type === 'count') {
        return true;
      }

      if (field) {
        return true;
      }
      return false;
    });
    if (metrics.length === 0) {
      metrics.push({ type: 'count' });
    }
    return metrics;
  }

  getMetricFields() {
    return this._getValidMetrics().map(metric => {
      return {
        ...metric,
        propertyKey: metric.type !== 'count' ? `${metric.type}_of_${metric.field}` : COUNT_PROP_NAME,
        propertyLabel: metric.type !== 'count' ? `${metric.type} of ${metric.field}` : COUNT_PROP_LABEL,
      };
    });
  }

  _makeAggConfigs(precision) {
    const metricAggConfigs = this.getMetricFields().map(metric => {
      const metricAggConfig = {
        id: metric.propertyKey,
        enabled: true,
        type: metric.type,
        schema: 'metric',
        params: {}
      };
      if (metric.type !== 'count') {
        metricAggConfig.params = { field: metric.field };
      }
      return metricAggConfig;
    });

    return [
      ...metricAggConfigs,
      {
        id: 'grid',
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
      type: 'VECTOR',
      properties: {
        fillColor: {
          type: 'DYNAMIC',
          options: {
            field: {
              label: COUNT_PROP_LABEL,
              name: COUNT_PROP_NAME,
              origin: 'source'
            },
            color: 'Blues'
          }
        },
        lineColor: {
          type: 'STATIC',
          options: {
            color: '#cccccc'
          }
        },
        lineWidth: {
          type: 'STATIC',
          options: {
            size: 1
          }
        },
        iconSize: {
          type: 'DYNAMIC',
          options: {
            field: {
              label: COUNT_PROP_LABEL,
              name: COUNT_PROP_NAME,
              origin: 'source'
            },
            minSize: 4,
            maxSize: 32,
          }
        },
        alphaValue: 1
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

  canFormatFeatureProperties() {
    return true;
  }

  async filterAndFormatProperties(properties) {
    properties = await super.filterAndFormatProperties(properties);
    const allProps = {};
    for  (const key in properties) {
      if (key !== 'geohash_meta') {
        allProps[key] = properties[key];
      }
    }
    return allProps;
  }
}
