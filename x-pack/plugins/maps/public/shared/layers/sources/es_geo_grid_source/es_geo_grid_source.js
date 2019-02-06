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
import { VectorStyle } from '../../styles/vector_style';
import { RENDER_AS } from './render_as';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';
import { GRID_RESOLUTION } from '../../grid_resolution';
import { getGeohashPrecisionForZoom } from './zoom_to_precision';

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

export class ESGeoGridSource extends AbstractESSource {

  static type = 'ES_GEO_GRID';
  static title = 'Elasticsearch grid aggregation';
  static description = 'Geospatial data grouped in grids with metrics for each gridded cell';

  static createDescriptor({ indexPatternId, geoField, requestType, resolution }) {
    return {
      type: ESGeoGridSource.type,
      id: uuid(),
      indexPatternId: indexPatternId,
      geoField: geoField,
      requestType: requestType,
      resolution: resolution ? resolution : GRID_RESOLUTION.COARSE
    };
  }

  static renderEditor({ onPreviewSource }) {
    const onSelect = (sourceConfig) => {
      const sourceDescriptor = ESGeoGridSource.createDescriptor(sourceConfig);
      const source = new ESGeoGridSource(sourceDescriptor);
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
        resolution={this._descriptor.resolution}
      />
    );
  }

  async getImmutableProperties() {
    let indexPatternTitle = this._descriptor.indexPatternId;
    try {
      const indexPattern = await this._getIndexPattern();
      indexPatternTitle = indexPattern.title;
    } catch (error) {
      // ignore error, title will just default to id
    }

    return [
      { label: 'Data source', value: ESGeoGridSource.title },
      { label: 'Index pattern', value: indexPatternTitle },
      { label: 'Geospatial field', value: this._descriptor.geoField },
      { label: 'Show as', value: this._descriptor.requestType },
    ];
  }

  getFieldNames() {
    return this.getMetricFields().map(({ propertyKey }) => {
      return propertyKey;
    });
  }

  isGeoGridPrecisionAware() {
    return true;
  }

  getGridResolution() {
    return this._descriptor.resolution;
  }

  getGeoGridPrecision(zoom) {
    return getGeohashPrecisionForZoom(zoom) + this._getGeoGridPrecisionResolutionDelta();
  }

  _getGeoGridPrecisionResolutionDelta() {
    if (this._descriptor.resolution === GRID_RESOLUTION.COARSE) {
      return 0;
    }

    if (this._descriptor.resolution === GRID_RESOLUTION.FINE) {
      return 1;
    }

    if (this._descriptor.resolution === GRID_RESOLUTION.MOST_FINE) {
      return 2;
    }

    throw new Error(`Grid resolution param not recognized: ${this._descriptor.resolution}`);
  }

  async getGeoJsonWithMeta({ layerName }, searchFilters) {

    const featureCollection = await this.getGeoJsonPoints({ layerName }, {
      geogridPrecision: searchFilters.geogridPrecision,
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
        areResultsTrimmed: false
      }
    };
  }

  async getNumberFields() {
    return this.getMetricFields().map(({ propertyKey: name, propertyLabel: label }) => {
      return { label, name };
    });
  }


  async getGeoJsonPoints({ layerName }, { geogridPrecision, buffer, timeFilters, query }) {

    const indexPattern = await this._getIndexPattern();
    const searchSource  = await this._makeSearchSource({ buffer, timeFilters, query }, 0);
    const aggConfigs = new AggConfigs(indexPattern, this._makeAggConfigs(geogridPrecision), aggSchemas.all);
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
    descriptor.style = VectorStyle.createDescriptor({
      fillColor: {
        type: VectorStyle.STYLE_TYPE.DYNAMIC,
        options: {
          field: {
            label: COUNT_PROP_LABEL,
            name: COUNT_PROP_NAME,
            origin: 'source'
          },
          color: 'Blues'
        }
      },
      iconSize: {
        type: VectorStyle.STYLE_TYPE.DYNAMIC,
        options: {
          field: {
            label: COUNT_PROP_LABEL,
            name: COUNT_PROP_NAME,
            origin: 'source'
          },
          minSize: 4,
          maxSize: 32,
        }
      }
    });
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
