/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { Fragment } from 'react';

import { ASource } from './source';
import { Schemas } from 'ui/vis/editors/default/schemas';
import {
  indexPatternService,
  SearchSource,
} from '../../../kibana_services';
import { AggConfigs } from 'ui/vis/agg_configs';
import { tabifyAggResponse } from 'ui/agg_response/tabify';
import { timefilter } from 'ui/timefilter/timefilter';

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
    title: 'Terms',
    aggFilter: 'terms',
    min: 1,
    max: 1
  }
]);

export class ESTableSource extends ASource {

  static type = 'ES_TABLE_SOURCE';


  static renderEditor({}) {
    return `<div>editor details</div>`;
  }

  renderDetails() {
    return (<Fragment>table source details</Fragment>);
  }

  async getTable(searchFilters) {

    // inspectorAdapters.requests.resetRequest(layerId);


    if (!this._descriptor.indexPatternId && !this._descriptor.term) {
      console.warn('Table source incorrectly configured');
      return [];
    }

    const indexPattern = await this._getIndexPattern();
    const timeAware = await this.isTimeAware();

    const aggConfigs = new AggConfigs(indexPattern, this._makeAggConfigs(), aggSchemas.all);

    let resp;
    try {
      const searchSource = new SearchSource();
      searchSource.setField('index', indexPattern);
      searchSource.setField('size', 0);
      searchSource.setField('filter', () => {
        const filters = [];
        if (timeAware) {
          filters.push(timefilter.createFilter(indexPattern, searchFilters.timeFilters));
        }
        return filters;
      });

      const dsl = aggConfigs.toDsl();
      searchSource.setField('aggs', dsl);
      resp = await searchSource.fetch();
    } catch (error) {
      throw new Error(`Elasticsearch search request failed, error: ${error.message}`);
    }

    const tabifiedResp = tabifyAggResponse(aggConfigs, resp);
    const keyColName = tabifiedResp.columns[0].id;
    const valueColName = tabifiedResp.columns[1].id;
    const newTable = tabifiedResp.rows.map((row) => {
      return {
        key: row[keyColName],
        value: row[valueColName]
      };
    });
    return newTable;
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


  async isTimeAware() {
    const indexPattern = await this._getIndexPattern();
    const timeField = indexPattern.timeFieldName;
    return !!timeField;
  }

  isFilterByMapBounds() {
    //todo
    return false;
  }

  _makeAggConfigs() {

    return [
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
        type: 'terms',
        schema: 'segment',
        params: {
          "field": this._descriptor.term,
          "size": 10000
        }
      }
    ];
  }


  async getDisplayName() {
    return `es_table ${this._descriptor.indexPatternId}`;
  }
}


