/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { type Filter, buildExistsFilter, buildPhraseFilter } from '@kbn/es-query';
import { ITooltipProperty } from './tooltip_property';
import { IField } from '../fields/field';
import { DataView, DataViewField } from '../../../../../../src/plugins/data/common';

export class ESTooltipProperty implements ITooltipProperty {
  private readonly _tooltipProperty: ITooltipProperty;
  private readonly _indexPattern: DataView;
  private readonly _field: IField;
  private readonly _applyGlobalQuery: boolean;

  constructor(
    tooltipProperty: ITooltipProperty,
    indexPattern: DataView,
    field: IField,
    applyGlobalQuery: boolean
  ) {
    this._tooltipProperty = tooltipProperty;
    this._indexPattern = indexPattern;
    this._field = field;
    this._applyGlobalQuery = applyGlobalQuery;
  }

  getPropertyKey(): string {
    return this._tooltipProperty.getPropertyKey();
  }

  getPropertyName() {
    return this._tooltipProperty.getPropertyName();
  }

  getRawValue(): string | string[] | undefined {
    return this._tooltipProperty.getRawValue();
  }

  _getIndexPatternField(): DataViewField | undefined {
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

    const formatter = this._indexPattern.getFormatterForField(indexPatternField);
    const htmlConverter = formatter.getConverterFor('html');
    return htmlConverter
      ? htmlConverter(this.getRawValue())
      : formatter.convert(this.getRawValue());
  }

  isFilterable(): boolean {
    if (!this._applyGlobalQuery) {
      return false;
    }

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
    if (!this._applyGlobalQuery) {
      return [];
    }

    const indexPatternField = this._getIndexPatternField();
    if (!indexPatternField) {
      return [];
    }

    const rawValue = this.getRawValue();
    if (rawValue == null) {
      const existsFilter = buildExistsFilter(indexPatternField, this._indexPattern);
      existsFilter.meta.negate = true;
      return [existsFilter];
    } else {
      const values = Array.isArray(rawValue) ? (rawValue as string[]) : [rawValue as string];
      return values.map((value) => {
        return buildPhraseFilter(indexPatternField, value, this._indexPattern);
      });
    }
  }
}
