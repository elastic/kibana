/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from './vector_source';
import {
  fetchSearchSourceAndRecordWithInspector,
  indexPatternService,
  inspectorAdapters, SearchSource
} from '../../../kibana_services';
import { createExtentFilter } from '../../../elasticsearch_geo_utils';
import { timefilter } from 'ui/timefilter/timefilter';

export class AbstractESSource extends AbstractVectorSource {

  static icon = 'logoElasticsearch';

  constructor(descriptor) {
    super(descriptor);
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

  getIndexPatternIds() {
    return  [this._descriptor.indexPatternId];
  }

  destroy() {
    inspectorAdapters.requests.resetRequest(this._descriptor.id);
  }

  async _runEsQuery(layerName, searchSource, requestDescription) {
    try {
      return await fetchSearchSourceAndRecordWithInspector({
        searchSource,
        requestName: layerName,
        requestId: this._descriptor.id,
        requestDesc: requestDescription
      });
    } catch(error) {
      throw new Error(`Elasticsearch search request failed, error: ${error.message}`);
    }
  }

  async _makeSearchSource({ buffer, query, timeFilters }, limit) {
    const indexPattern = await this._getIndexPattern();
    const geoField = await this._getGeoField();
    const isTimeAware = await this.isTimeAware();
    const searchSource = new SearchSource();
    searchSource.setField('index', indexPattern);
    searchSource.setField('size', limit);
    searchSource.setField('filter', () => {
      const filters = [];
      if (this.isFilterByMapBounds()) {
        filters.push(createExtentFilter(buffer, geoField.name, geoField.type));
      }
      if (isTimeAware) {
        filters.push(timefilter.createFilter(indexPattern, timeFilters));
      }
      return filters;
    });
    searchSource.setField('query', query);
    return searchSource;
  }

  async isTimeAware() {
    const indexPattern = await this._getIndexPattern();
    const timeField = indexPattern.timeFieldName;
    return !!timeField;
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

  async _getGeoField() {
    const indexPattern = await this._getIndexPattern();
    const geoField = indexPattern.fields.byName[this._descriptor.geoField];
    if (!geoField) {
      throw new Error(`Index pattern ${indexPattern.title} no longer contains the geo field ${this._descriptor.geoField}`);
    }
    return geoField;
  }

  async getDisplayName() {
    const indexPattern = await this._getIndexPattern();
    return indexPattern.title;
  }

}
