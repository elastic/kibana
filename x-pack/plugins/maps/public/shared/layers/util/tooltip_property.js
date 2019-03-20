/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { buildPhraseFilter } from '@kbn/es-query';

import { filterBarQueryFilter } from '../../../kibana_services';

export class TooltipProperty {

  constructor(propertyName, rawValue) {
    this._propertyName = propertyName;
    this._rawValue = rawValue;
  }


  getRawValue() {
    return this._rawValue;
  }

  getPropertyName() {
    return this._propertyName;
  }


  getHtmlDisplayValue() {
    return _.escape(this._rawValue);
  }

  isFilterable() {
    return false;
  }

  getFilterAction() {
    throw new Error('This property is not filterable');
  }
}


export class ESTooltipProperty extends TooltipProperty {

  constructor(propertyName, rawValue, indexPattern) {
    super(propertyName, rawValue);
    this._indexPattern = indexPattern;
  }

  getHtmlDisplayValue() {
    const field = this._indexPattern.fields.byName[this._propertyName];
    if (!field) {
      return '-';
    }
    const htmlConverter = field.format.getConverterFor('html');
    return  (htmlConverter) ? htmlConverter(this._rawValue) :
      field.format.convert(this._rawValue);
  }

  isFilterable() {
    const field = this._indexPattern.fields.byName[this._propertyName];
    if (!field) {
      return false;
    }
    return field.type === 'string';
  }

  getFilterAction() {
    return () => {
      const phraseFilter = buildPhraseFilter(
        this._indexPattern.fields.byName[this._propertyName],
        this._rawValue,
        this._indexPattern);
      filterBarQueryFilter.addFilters(phraseFilter);
    };
  }
}


export class ESMetricJoinTooltipProperty extends ESTooltipProperty {

  constructor(propertyName, rawValue, indexPattern, metricField) {
    super(propertyName, rawValue, indexPattern);
    this._metricField = metricField;
  }
  isFilterable() {
    return false;
  }

  getHtmlDisplayValue() {
    if (typeof this._rawValue === 'undefined') {
      return '-';
    }
    if (this._metricField.type === 'count') {
      return this._rawValue;
    }
    const indexPatternField = this._indexPattern.fields.byName[this._metricField.field];
    if (!indexPatternField) {
      return this._rawValue;
    }
    const htmlConverter = indexPatternField.format.getConverterFor('html');

    return (htmlConverter)
      ? htmlConverter(this._rawValue)
      : indexPatternField.format.convert(this._rawValue);

  }

}
