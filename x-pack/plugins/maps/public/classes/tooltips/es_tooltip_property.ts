/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ITooltipProperty } from './tooltip_property';
import { IField } from '../fields/field';
import {
  esFilters,
  Filter,
  IFieldType,
  IndexPattern,
} from '../../../../../../src/plugins/data/public';

export class ESTooltipProperty implements ITooltipProperty {
  private readonly _tooltipProperty: ITooltipProperty;
  private readonly _indexPattern: IndexPattern;
  private readonly _field: IField;

  constructor(tooltipProperty: ITooltipProperty, indexPattern: IndexPattern, field: IField) {
    this._tooltipProperty = tooltipProperty;
    this._indexPattern = indexPattern;
    this._field = field;
  }

  getPropertyKey(): string {
    return this._tooltipProperty.getPropertyKey();
  }

  getPropertyName(): string {
    return this._tooltipProperty.getPropertyName();
  }

  getRawValue(): string | string[] | undefined {
    return this._tooltipProperty.getRawValue();
  }

  _getIndexPatternField(): IFieldType | undefined {
    return this._indexPattern.fields.getByName(this._field.getRootName());
  }

  getHtmlDisplayValue(): string {
    if (typeof this.getRawValue() === 'undefined') {
      return '-';
    }

    const indexPatternField = this._getIndexPatternField();
    if (!indexPatternField || !this._field.canValueBeFormatted()) {
      const rawValue = this.getRawValue();
      if (Array.isArray(rawValue)) {
        return _.escape(rawValue.join());
      } else {
        return _.escape(rawValue);
      }
    }

    const htmlConverter = indexPatternField.format.getConverterFor('html');
    return htmlConverter
      ? htmlConverter(this.getRawValue())
      : indexPatternField.format.convert(this.getRawValue());
  }

  isFilterable(): boolean {
    const indexPatternField = this._getIndexPatternField();
    return (
      !!indexPatternField &&
      (indexPatternField.type === 'string' ||
        indexPatternField.type === 'date' ||
        indexPatternField.type === 'ip' ||
        indexPatternField.type === 'number')
    );
  }

  async getESFilters(): Promise<Filter[]> {
    const indexPatternField = this._getIndexPatternField();
    if (!indexPatternField) {
      return [];
    }

    const value = this.getRawValue();
    if (value == null) {
      const existsFilter = esFilters.buildExistsFilter(indexPatternField, this._indexPattern);
      existsFilter.meta.negate = true;
      return [existsFilter];
    } else {
      return [esFilters.buildPhraseFilter(indexPatternField, value, this._indexPattern)];
    }
  }
}
