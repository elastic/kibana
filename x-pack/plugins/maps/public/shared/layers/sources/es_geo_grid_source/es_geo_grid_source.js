/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import uuid from 'uuid/v4';

import { AbstractESSource } from '../es_source';
import { HeatmapLayer } from '../../heatmap_layer';
import { VectorLayer } from '../../vector_layer';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { AggConfigs } from 'ui/vis/agg_configs';
import { tabifyAggResponse } from 'ui/agg_response/tabify';
import { convertToGeoJson } from './convert_to_geojson';
import { VectorStyle } from '../../styles/vector_style';
import { RENDER_AS } from './render_as';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';
import { GRID_RESOLUTION } from '../../grid_resolution';
import { filterPropertiesForTooltip } from '../../util';

const COUNT_PROP_LABEL = 'count';
const COUNT_PROP_NAME = 'doc_count';
const MAX_GEOTILE_LEVEL = 29;

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
    title: 'Geo Grid',
    aggFilter: 'geotile_grid',
    min: 1,
    max: 1
  }
]);

export class ESGeoGridSource extends AbstractESSource {

  static type = 'ES_GEO_GRID';
  static title = 'Grid aggregation';
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

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSelect = (sourceConfig) => {
      if (!sourceConfig) {
        onPreviewSource(null);
        return;
      }

      const sourceDescriptor = ESGeoGridSource.createDescriptor(sourceConfig);
      const source = new ESGeoGridSource(sourceDescriptor, inspectorAdapters);
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

  isJoinable() {
    return false;
  }

  getGridResolution() {
    return this._descriptor.resolution;
  }

  getGeoGridPrecision(zoom) {
    const targetGeotileLevel = Math.ceil(zoom) + this._getGeoGridPrecisionResolutionDelta();
    return Math.min(targetGeotileLevel, MAX_GEOTILE_LEVEL);
  }

  _getGeoGridPrecisionResolutionDelta() {
    if (this._descriptor.resolution === GRID_RESOLUTION.COARSE) {
      return 2;
    }

    if (this._descriptor.resolution === GRID_RESOLUTION.FINE) {
      return 3;
    }

    if (this._descriptor.resolution === GRID_RESOLUTION.MOST_FINE) {
      return 4;
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
    const { featureCollection } = convertToGeoJson({
      table: tabifiedResp,
      renderAs: this._descriptor.requestType,
    });

    return featureCollection;
  }

  isFilterByMapBounds() {
    return true;
  }


  _formatMetricKey(metric) {
    return metric.type !== 'count' ? `${metric.type}_of_${metric.field}` : COUNT_PROP_NAME;
  }

  _formatMetricLabel(metric) {
    return metric.type !== 'count' ? `${metric.type} of ${metric.field}` : COUNT_PROP_LABEL;
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
        type: 'geotile_grid',
        schema: 'segment',
        params: {
          field: this._descriptor.geoField,
          useGeocentroid: true,
          precision: precision,
        }
      },
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
    const metricFields = this.getMetricFields();
    return filterPropertiesForTooltip(metricFields, properties);

  }
}
