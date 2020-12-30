/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ESTooltipProperty } from './es_tooltip_property';
import { AGG_TYPE } from '../../../common/constants';
import { ITooltipProperty } from './tooltip_property';
import { IField } from '../fields/field';
import { IndexPattern } from '../../../../../../src/plugins/data/public';

export class ESAggTooltipProperty extends ESTooltipProperty {
  private readonly _aggType: AGG_TYPE;

  constructor(
    tooltipProperty: ITooltipProperty,
    indexPattern: IndexPattern,
    field: IField,
    aggType: AGG_TYPE
  ) {
    super(tooltipProperty, indexPattern, field);
    this._aggType = aggType;
  }

  isFilterable(): boolean {
    return this._aggType === AGG_TYPE.TERMS;
  }
}
