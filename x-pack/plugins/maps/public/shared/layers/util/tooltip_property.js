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

  getPropertyName() {
    return this._propertyName;
  }

  getHtmlDisplayValue() {
    return _.escape(this._rawValue);
  }

  getRawValue() {
    return this._rawValue;
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

    if (typeof this._rawValue === 'undefined') {
      return '-';
    }

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
    return field && field.type === 'string';
  }

  getESFilter() {
    return buildPhraseFilter(
      this._indexPattern.fields.byName[this._propertyName],
      this._rawValue,
      this._indexPattern);
  }

  getFilterAction() {
    return () => {
      const phraseFilter = this.getESFilter();
      filterBarQueryFilter.addFilters([phraseFilter]);
    };
  }
}


export class ESAggMetricTooltipProperty extends ESTooltipProperty {

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


export class JoinTooltipProperty extends TooltipProperty {

  constructor(tooltipProperty, leftInnerJoins) {
    super();
    this._tooltipProperty = tooltipProperty;
    this._leftInnerJoins = leftInnerJoins;
  }

  isFilterable() {
    return true;
  }

  getPropertyName() {
    return this._tooltipProperty.getPropertyName();
  }

  getHtmlDisplayValue() {
    return this._tooltipProperty.getHtmlDisplayValue();
  }

  getFilterAction() {
    //dispatch all the filter actions to the query bar
    //this relies on the de-duping of filterBarQueryFilter
    return async () => {
      const esFilters = [];
      if (this._tooltipProperty.isFilterable()) {
        esFilters.push(this._tooltipProperty.getESFilter());
      }

      for (let i = 0; i < this._leftInnerJoins.length; i++) {
        const rightSource =  this._leftInnerJoins[i].getRightJoinSource();
        const esTooltipProperty = await rightSource.createESTooltipProperty(
          rightSource.getTerm(),
          this._tooltipProperty.getRawValue()
        );
        if (esTooltipProperty) {
          const filter = esTooltipProperty.getESFilter();
          esFilters.push(filter);
        }
      }
      filterBarQueryFilter.addFilters(esFilters);
    };
  }


}
