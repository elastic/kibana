/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
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
import { ZOOM_TO_PRECISION } from '../../../utils/zoom_to_precision';
import { VectorStyle } from '../../styles/vector_style';
import { RENDER_AS } from './render_as';
import { CreateSourceEditor } from './create_source_editor';
import { UpdateSourceEditor } from './update_source_editor';
import {
  EuiText,
  EuiSpacer
} from '@elastic/eui';

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

  static renderDropdownDisplayOption() {
    return (
      <Fragment>
        <strong>{ESGeohashGridSource.typeDisplayName}</strong>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            Group geospatial data in grids with metrics for each gridded cell
          </p>
        </EuiText>
      </Fragment>
    );
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

  async getNumberFields() {
    return this.getMetricFields().map(({ propertyKey: name, propertyLabel: label }) => {
      return { label, name };
    });
  }

  async getGeoJsonPointsWithTotalCount({ precision, extent, timeFilters, layerName, query }) {

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
