/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

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

  renderTooltipRow() {

  }

  // isFilterable() {
  //   return false;
  // }

  // getFilterAction() {
  //
  // }
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
    console.log('htmlconver', htmlConverter);
    return  (htmlConverter) ? htmlConverter(this._rawValue) :
      field.format.convert(this._rawValue);
  }
}
