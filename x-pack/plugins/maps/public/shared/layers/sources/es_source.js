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
      throw new Error(`Elasticsearch search request failed, error: ${error.message}`);
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
      throw new Error(`Unable to find Index pattern for id: ${this._descriptor.indexPatternId}`);
    }
  }

  async _getGeoField() {
    const indexPattern = await this._getIndexPattern();
    const geoField = indexPattern.fields.byName[this._descriptor.geoField];
    if (!geoField) {
      throw new Error(`Index pattern ${indexPattern.title} no longer contains the geo field ${this._descriptor.geoField}`);
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
