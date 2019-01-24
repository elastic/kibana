/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
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
import { convertToGeoJson } from './convert_to_geojson';
import { ESSourceDetails } from '../../../components/es_source_details';
import { VectorStyle } from '../../styles/vector_style';
import { RENDER_AS } from './render_as';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';
import { GRID_RESOLUTION } from '../../grid_resolution';

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

export class ESGeohashGridSource extends VectorSource {

  static type = 'ES_GEOHASH_GRID';
  static title = 'Elasticsearch geohash aggregation';
  static description = 'Group geospatial data in grids with metrics for each gridded cell';
  static icon = 'logoElasticsearch';

  static createDescriptor({ indexPatternId, geoField, requestType, resolution }) {
    return {
      type: ESGeohashGridSource.type,
      id: uuid(),
      indexPatternId: indexPatternId,
      geoField: geoField,
      requestType: requestType,
      resolution: resolution ? resolution : GRID_RESOLUTION.COARSE
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
        resolution={this._descriptor.resolution}
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

  destroy() {
    inspectorAdapters.requests.resetRequest(this._descriptor.id);
  }

  isFieldAware() {
    return true;
  }

  isRefreshTimerAware() {
    return true;
  }

  isQueryAware() {
    return true;
  }

  getFieldNames() {
    return this.getMetricFields().map(({ propertyKey }) => {
      return propertyKey;
    });
  }

  getIndexPatternIds() {
    return  [this._descriptor.indexPatternId];
  }

  isGeohashPrecisionAware() {
    return true;
  }

  getGridResolution() {
    return this._descriptor.resolution;
  }

  getGeohashPrecisionResolutionDelta() {
    let refinementFactor;
    if (this._descriptor.resolution === GRID_RESOLUTION.COARSE) {
      refinementFactor = 0;
    } else if (this._descriptor.resolution === GRID_RESOLUTION.FINE) {
      refinementFactor = 1;
    } else if (this._descriptor.resolution === GRID_RESOLUTION.MOST_FINE) {
      refinementFactor = 2;
    } else {
      throw new Error(`Resolution param not recognized: ${this._descriptor.resolution}`);
    }
    return refinementFactor;
  }

  async getGeoJsonWithMeta({ layerName }, searchFilters) {
    const featureCollection = await this.getGeoJsonPoints({
      geohashPrecision: searchFilters.geohashPrecision,
      extent: searchFilters.buffer,
      timeFilters: searchFilters.timeFilters,
      layerName,
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

  async getGeoJsonPoints({ geohashPrecision, extent, timeFilters, layerName, query }) {

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

    const aggConfigs = new AggConfigs(indexPattern, this._makeAggConfigs(geohashPrecision), aggSchemas.all);

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
      searchSource.setField('query', query);

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

  async getDisplayName() {
    const indexPattern = await this._getIndexPattern();
    return indexPattern.title;
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
