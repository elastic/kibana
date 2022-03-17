/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESTooltipProperty } from './es_tooltip_property';
import { AGG_TYPE } from '../../../common/constants';
import { ITooltipProperty } from './tooltip_property';
import { IESAggField } from '../fields/agg';
import { DataView } from '../../../../../../src/plugins/data/common';

export class ESAggTooltipProperty extends ESTooltipProperty {
  private readonly _aggType: AGG_TYPE;
  private readonly _aggField: IESAggField;

  constructor(
    tooltipProperty: ITooltipProperty,
    indexPattern: DataView,
    field: IESAggField,
    aggType: AGG_TYPE,
    applyGlobalQuery: boolean
  ) {
    super(tooltipProperty, indexPattern, field, applyGlobalQuery);
    this._aggType = aggType;
    this._aggField = field;
  }

  getHtmlDisplayValue(): string {
    const rawValue = this.getRawValue();
    return typeof rawValue !== 'undefined' && this._aggField.isCount()
      ? parseInt(rawValue as string, 10).toLocaleString()
      : super.getHtmlDisplayValue();
  }

  isFilterable(): boolean {
    return this._aggType === AGG_TYPE.TERMS ? super.isFilterable() : false;
  }
}
