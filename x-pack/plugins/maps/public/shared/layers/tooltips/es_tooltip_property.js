/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildPhraseFilter } from '@kbn/es-query';
import { filterBarQueryFilter } from '../../../kibana_services';
import { TooltipProperty } from './tooltip_property';
import _ from 'lodash';

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
      return _.escape(this._rawValue);
    }
    const htmlConverter = field.format.getConverterFor('html');
    return htmlConverter ? htmlConverter(this._rawValue) : field.format.convert(this._rawValue);
  }

  isFilterable() {
    const field = this._indexPattern.fields.byName[this._propertyName];
    return field && (field.type === 'string' || field.type === 'date' || field.type === 'ip' || field.type === 'number');
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
