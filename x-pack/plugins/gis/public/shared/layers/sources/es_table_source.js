/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';

import { ASource } from './source';
import { Schemas } from 'ui/vis/editors/default/schemas';
import {
  indexPatternService,
  SearchSource,
} from '../../../kibana_services';
import { AggConfigs } from 'ui/vis/agg_configs';
import { timefilter } from 'ui/timefilter/timefilter';

const TERMS_AGG_NAME = 'join';

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
    title: 'Terms',
    aggFilter: 'terms',
    min: 1,
    max: 1
  }
]);

export function extractPropertiesMap(resp, propertyNames, countPropertyName) {
  const propertiesMap = new Map();
  _.get(resp, ['aggregations', TERMS_AGG_NAME, 'buckets'], []).forEach(termBucket => {
    const properties = {};
    if (countPropertyName) {
      properties[countPropertyName] = termBucket.doc_count;
    }
    propertyNames.forEach(propertyName => {
      if (_.has(termBucket, [propertyName, 'value'])) {
        properties[propertyName] = _.get(termBucket, [propertyName, 'value']);
      }
    });
    propertiesMap.set(termBucket.key, properties);
  });
  return propertiesMap;
}

export class ESTableSource extends ASource {

  static type = 'ES_TABLE_SOURCE';


  static renderEditor({}) {
    return `<div>editor details</div>`;
  }

  renderDetails() {
    return (<Fragment>table source details</Fragment>);
  }

  hasCompleteConfig() {
    if (_.has(this._descriptor, 'indexPatternId') && _.has(this._descriptor, 'term')) {
      return true;
    }

    return false;
  }

  async getTable(searchFilters) {

    // inspectorAdapters.requests.resetRequest(layerId);


    if (!this.hasCompleteConfig()) {
      return [];
    }

    const indexPattern = await this._getIndexPattern();
    const timeAware = await this.isTimeAware();

    const configStates = this._makeAggConfigs();
    const aggConfigs = new AggConfigs(indexPattern, configStates, aggSchemas.all);

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

    const metricPropertyNames = configStates
      .filter(configState => {
        return configState.schema === 'metric' && configState.type !== 'count';
      })
      .map(configState => {
        return configState.id;
      });
    const countConfigState = configStates.find(configState => {
      return configState.type === 'count';
    });
    const countPropertyName = _.get(countConfigState, 'id');

    return {
      rawData: resp,
      propertiesMap: extractPropertiesMap(resp, metricPropertyNames, countPropertyName),
    };
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



  getMetricFields() {
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
    return metrics.map(metric => {
      const metricKey = metric.type !== 'count' ? `${metric.type}_of_${metric.field}` : metric.type;
      const metricLabel = metric.type !== 'count' ? `${metric.type}(${metric.field})` : 'count(*)';
      return {
        ...metric,
        property_key: `__kbnjoin__${metricKey}_groupby_${this._descriptor.indexPatternTitle}.${this._descriptor.term}`,
        property_label: `${metricLabel} group by ${this._descriptor.indexPatternTitle}.${this._descriptor.term}`,
      };
    });
  }

  _makeAggConfigs() {
    const metricAggConfigs = this.getMetricFields().map(metric => {
      const metricAggConfig = {
        id: metric.property_key,
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
        id: TERMS_AGG_NAME,
        enabled: true,
        type: 'terms',
        schema: 'segment',
        params: {
          field: this._descriptor.term,
          size: 10000
        }
      }
    ];
  }

  async getDisplayName() {
    return `es_table ${this._descriptor.indexPatternId}`;
  }
}
