/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { AbstractESSource } from './es_source';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { AggConfigs } from 'ui/vis/agg_configs';
import { i18n } from '@kbn/i18n';
import { ESTooltipProperty } from '../tooltips/es_tooltip_property';

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

export function extractPropertiesMap(rawEsData, propertyNames, countPropertyName) {
  const propertiesMap = new Map();
  _.get(rawEsData, ['aggregations', TERMS_AGG_NAME, 'buckets'], []).forEach(termBucket => {
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

export class ESJoinSource extends AbstractESSource {

  static type = 'ES_JOIN_SOURCE';


  static renderEditor({}) {
    //no need to localize. this editor is never rendered.
    return `<div>editor details</div>`;
  }

  hasCompleteConfig() {
    if (_.has(this._descriptor, 'indexPatternId') && _.has(this._descriptor, 'term')) {
      return true;
    }

    return false;
  }

  getIndexPatternIds() {
    return  [this._descriptor.indexPatternId];
  }

  getTerm() {
    return this._descriptor.term;
  }

  _formatMetricKey(metric) {
    const metricKey = metric.type !== 'count' ? `${metric.type}_of_${metric.field}` : metric.type;
    return `__kbnjoin__${metricKey}_groupby_${this._descriptor.indexPatternTitle}.${this._descriptor.term}`;
  }

  _formatMetricLabel(metric) {
    const metricLabel = metric.type !== 'count' ? `${metric.type} ${metric.field}` : 'count';
    return `${metricLabel} of ${this._descriptor.indexPatternTitle}:${this._descriptor.term}`;
  }

  async getPropertiesMap(searchFilters, leftSourceName, leftFieldName) {

    if (!this.hasCompleteConfig()) {
      return [];
    }

    const indexPattern = await this._getIndexPattern();
    const searchSource  = await this._makeSearchSource(searchFilters, 0);
    const configStates = this._makeAggConfigs();
    const aggConfigs = new AggConfigs(indexPattern, configStates, aggSchemas.all);
    searchSource.setField('aggs', aggConfigs.toDsl());

    const requestName = `${this._descriptor.indexPatternTitle}.${this._descriptor.term}`;
    const requestDesc = this.getJoinDescription(leftSourceName, leftFieldName);
    const rawEsData = await this._runEsQuery(requestName, searchSource, requestDesc);

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
      propertiesMap: extractPropertiesMap(rawEsData, metricPropertyNames, countPropertyName),
    };
  }

  isFilterByMapBounds() {
    return false;
  }

  getJoinDescription(leftSourceName, leftFieldName) {
    const metrics = this._getValidMetrics().map(metric => {
      return metric.type !== 'count' ? `${metric.type} ${metric.field}` : 'count';
    });
    const joinStatement = [];
    joinStatement.push(i18n.translate('xpack.maps.source.esJoin.joinLeftDescription', {
      defaultMessage: `Join {leftSourceName}:{leftFieldName} with`,
      values: { leftSourceName, leftFieldName }
    }));
    joinStatement.push(`${this._descriptor.indexPatternTitle}:${this._descriptor.term}`);
    joinStatement.push(i18n.translate('xpack.maps.source.esJoin.joinMetricsDescription', {
      defaultMessage: `for metrics {metrics}`,
      values: { metrics: metrics.join(',') }
    }));
    return i18n.translate('xpack.maps.source.esJoin.joinDescription', {
      defaultMessage: `Elasticsearch terms aggregation request for {description}`,
      values: {
        description: joinStatement.join(' ')
      }
    });
  }

  _makeAggConfigs() {
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
    //no need to localize. this is never rendered.
    return `es_table ${this._descriptor.indexPatternId}`;
  }

  async filterAndFormatPropertiesToHtml(properties) {
    return await this.filterAndFormatPropertiesToHtmlForMetricFields(properties);
  }

  async createESTooltipProperty(propertyName, rawValue) {
    try {
      const indexPattern = await this._getIndexPattern();
      if (!indexPattern) {
        return null;
      }
      return new ESTooltipProperty(propertyName, rawValue, indexPattern);
    } catch (e) {
      return null;
    }
  }
}
