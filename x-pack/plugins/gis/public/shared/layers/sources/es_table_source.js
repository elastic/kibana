/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, {Fragment} from 'react';
import PropTypes from 'prop-types';

import {
  EuiFormRow,
  EuiButton,
} from '@elastic/eui';
import {IndexPatternSelect} from 'ui/index_patterns/components/index_pattern_select';


import {ASource} from './source';
import {GeohashGridLayer} from '../geohashgrid_layer';
import {Schemas} from 'ui/vis/editors/default/schemas';
import {
  indexPatternService,
  inspectorAdapters,
  SearchSource,
  timeService,
} from '../../../kibana_services';
import {createExtentFilter} from '../../../elasticsearch_geo_utils';
import {AggConfigs} from 'ui/vis/agg_configs';
import {tabifyAggResponse} from 'ui/agg_response/tabify';
import {convertToGeoJson} from 'ui/vis/map/convert_to_geojson';
import {getRequestInspectorStats, getResponseInspectorStats} from 'ui/courier/utils/courier_inspector_utils';

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

  async getTable() {

    // inspectorAdapters.requests.resetRequest(layerId);

    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(this._descriptor.indexPatternId);
    } catch (error) {
      throw new Error(`Unable to find Index pattern ${this._descriptor.indexPatternId}`);
    }

    const aggConfigs = new AggConfigs(indexPattern, this._makeAggConfigs(), aggSchemas.all);
    //
    // let inspectorRequest;
    let resp;
    try {
      const searchSource = new SearchSource();
      searchSource.setField('index', indexPattern);
      searchSource.setField('size', 0);

      const dsl = aggConfigs.toDsl();
      searchSource.setField('aggs', dsl);
      // searchSource.setField('filter', () => {
      //   const filters = [];
      //   filters.push(createExtentFilter(extent, geoField.name, geoField.type));
      //   filters.push(timeService.createFilter(indexPattern, timeFilters));
      //   return filters;
      // });

      // inspectorRequest = inspectorAdapters.requests.start(layerId, layerName);
      // inspectorRequest.stats(getRequestInspectorStats(searchSource));
      searchSource.getSearchRequestBody().then(body => {
        // inspectorRequest.json(body);
      });
      resp = await searchSource.fetch();
      // inspectorRequest
      //   .stats(getResponseInspectorStats(searchSource, resp))
      //   .ok({ json: resp });
    } catch (error) {
      // inspectorRequest.error({ error });
      throw new Error(`Elasticsearch search request failed, error: ${error.message}`);
    }

    console.log('response', resp);
    //
    // const tabifiedResp = tabifyAggResponse(aggConfigs, resp);
    // const { featureCollection } = convertToGeoJson(tabifiedResp);
    //
    // return featureCollection;


    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            key: 'CA',
            value: 1000,
          },
          {
            key: 'CN',
            value: 5000,
          },
          {
            key: 'US',
            value: 2000,
          },
          {
            key: 'IN',
            value: 4000,
          },
          {
            key: 'BE',
            value: 1000,
          },
          {
            key: 'MC',
            value: 1000,
          }
        ]);
      }, 500);
    });


  }



  async isTimeAware() {
    //todo
    return false;
  }

  isFilterByMapBounds() {
    //todo
    return false;
  }

    _makeAggConfigs() {

    console.log('make aggs configs', this._descriptor);
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
          "field": "geo.dest",
          "size": 10000
          //,
          // "order": {
          //   "_count": "desc"
          // }
        }
      }
    ];
  }


  getDisplayName() {
    return `es_table ${this._descriptor.indexPatternId}`;
  }
}


