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
import {SingleFieldSelect} from './single_field_select';

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
    title: 'Geo Coordinates',
    aggFilter: 'geohash_grid',
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
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            key: 'CA',
            value: 1000,
          },
          {
            key: 'US',
            value: 2000,
          }
        ]);
      }, 500);
    });
  }

  async isTimeAware() {
    //todo
    return false;
  }

  async isFilterByMapBounds() {
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
        type: 'term',
        schema: 'segment',
        params: {}
      }
    ];
  }


  getDisplayName() {
    return `es_table ${this._descriptor.indexPatternId}`;
  }
}


