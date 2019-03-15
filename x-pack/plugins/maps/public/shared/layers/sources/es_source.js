/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from './vector_source';
import {
  fetchSearchSourceAndRecordWithInspector,
  indexPatternService,
  SearchSource
} from '../../../kibana_services';
import { createExtentFilter } from '../../../elasticsearch_geo_utils';
import { timefilter } from 'ui/timefilter/timefilter';
import _ from 'lodash';
import { AggConfigs } from 'ui/vis/agg_configs';
import { i18n } from '@kbn/i18n';


export class AbstractESSource extends AbstractVectorSource {

  static icon = 'logoElasticsearch';

  isFieldAware() {
    return true;
  }

  isRefreshTimerAware() {
    return true;
  }

  isQueryAware() {
    return true;
  }

  getIndexPatternIds() {
    return  [this._descriptor.indexPatternId];
  }

  destroy() {
    this._inspectorAdapters.requests.resetRequest(this._descriptor.id);
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

  _formatMetricKey() {
    throw new Error('should implement');
  }

  _formatMetricLabel() {
    throw new Error('should implement');
  }

  getMetricFields() {
    return this._getValidMetrics().map(metric => {
      const metricKey = this._formatMetricKey(metric);
      const metricLabel = this._formatMetricLabel(metric);
      return {
        ...metric,
        propertyKey: metricKey,
        propertyLabel: metricLabel
      };
    });
  }

  async filterAndFormatPropertiesToHtmlForMetricFields(properties) {
    let indexPattern;
    try {
      indexPattern = await this._getIndexPattern();
    } catch(error) {
      console.warn(`Unable to find Index pattern ${this._descriptor.indexPatternId}, values are not formatted`);
      return properties;
    }

    function formatMetricValue(metricField, propertyValue) {
      if (metricField.type === 'count') {
        return propertyValue;
      }

      const indexPatternField = indexPattern.fields.byName[metricField.field];
      if (!indexPatternField) {
        return propertyValue;
      }

      const htmlConverter = indexPatternField.format.getConverterFor('html');
      return (htmlConverter)
        ? htmlConverter(propertyValue)
        : indexPatternField.format.convert(propertyValue);
    }

    const metricFields = this.getMetricFields();
    const tooltipProps = {};
    metricFields.forEach((metricField) => {
      let value;
      for (const key in properties) {
        if (properties.hasOwnProperty(key) && metricField.propertyKey === key) {
          value = formatMetricValue(metricField, properties[key]);
          break;
        }
      }
      tooltipProps[metricField.propertyLabel] = (typeof value === 'undefined') ? '-' : value;
    });
    return tooltipProps;
  }


  async _runEsQuery(layerName, searchSource, requestDescription) {
    try {
      return await fetchSearchSourceAndRecordWithInspector({
        inspectorAdapters: this._inspectorAdapters,
        searchSource,
        requestName: layerName,
        requestId: this._descriptor.id,
        requestDesc: requestDescription
      });
    } catch(error) {
      throw new Error('xpack.maps.source.esSource.requestFailedErrorMessage', {
        defaultMessage: `Elasticsearch search request failed, error: {message}`,
        values: { message: error.message }
      });
    }
  }

  async _makeSearchSource({ buffer, query, timeFilters, filters }, limit) {
    const indexPattern = await this._getIndexPattern();
    const geoField = await this._getGeoField();
    const isTimeAware = await this.isTimeAware();
    const searchSource = new SearchSource();
    searchSource.setField('index', indexPattern);
    searchSource.setField('size', limit);
    searchSource.setField('filter', () => {
      const allFilters = [...filters];
      if (this.isFilterByMapBounds() && buffer) {//buffer can be empty
        allFilters.push(createExtentFilter(buffer, geoField.name, geoField.type));
      }
      if (isTimeAware) {
        allFilters.push(timefilter.createFilter(indexPattern, timeFilters));
      }
      return allFilters;
    });
    searchSource.setField('query', query);
    return searchSource;
  }

  async getBoundsForFilters({ query, timeFilters, filters }) {

    const searchSource = await this._makeSearchSource({ query, timeFilters, filters }, 0);
    const geoField = await this._getGeoField();
    const indexPattern = await this._getIndexPattern();

    const geoBoundsAgg = [{
      type: 'geo_bounds',
      enabled: true,
      params: {
        field: geoField
      },
      schema: 'metric'
    }];

    const aggConfigs = new AggConfigs(indexPattern, geoBoundsAgg);
    searchSource.setField('aggs', aggConfigs.toDsl());

    let esBounds;
    try {
      const esResp = await searchSource.fetch();
      esBounds = _.get(esResp, 'aggregations.1.bounds');
    } catch(error) {
      esBounds = {
        top_left: {
          lat: 90,
          lon: -180
        },
        bottom_right: {
          lat: -90,
          lon: 180
        }
      };
    }

    return {
      min_lon: esBounds.top_left.lon,
      max_lon: esBounds.bottom_right.lon,
      min_lat: esBounds.bottom_right.lat,
      max_lat: esBounds.top_left.lat
    };
  }

  async isTimeAware() {
    try {
      const indexPattern = await this._getIndexPattern();
      const timeField = indexPattern.timeFieldName;
      return !!timeField;
    } catch (error) {
      return false;
    }
  }

  async _getIndexPattern() {
    if (this.indexPattern) {
      return this.indexPattern;
    }

    try {
      this.indexPattern = await indexPatternService.get(this._descriptor.indexPatternId);
      return this.indexPattern;
    } catch (error) {
      throw new Error(i18n.translate('xpack.maps.source.esSource.noIndexPatternErrorMessage', {
        defaultMessage: `Unable to find Index pattern for id: {indexPatternId}`,
        values: { indexPatternId: this._descriptor.indexPatternId }
      }));
    }
  }

  async supportsFitToBounds() {
    try {
      const geoField = await this._getGeoField();
      // geo_bounds aggregation only supports geo_point
      // there is currently no backend support for getting bounding box of geo_shape field
      return geoField.type !== 'geo_shape';
    } catch (error) {
      return false;
    }
  }


  async _getGeoField() {
    const indexPattern = await this._getIndexPattern();
    const geoField = indexPattern.fields.byName[this._descriptor.geoField];
    if (!geoField) {
      throw new Error(i18n.translate('xpack.maps.source.esSource.noGeoFieldErrorMessage', {
        defaultMessage: `Index pattern {indexPatternTitle} no longer contains the geo field {geoField}`,
        values: { indexPatternTitle: indexPattern.title, geoField: this._descriptor.geoField }
      }));
    }
    return geoField;
  }

  async getDisplayName() {
    try {
      const indexPattern = await this._getIndexPattern();
      return indexPattern.title;
    } catch (error) {
      // Unable to load index pattern, just return id as display name
      return this._descriptor.indexPatternId;
    }
  }

  isBoundsAware() {
    return true;
  }

}
