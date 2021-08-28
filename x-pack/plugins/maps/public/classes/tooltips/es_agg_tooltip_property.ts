/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IndexPattern } from '../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import { AGG_TYPE } from '../../../common/constants';
import type { IField } from '../fields/field';
import { ESTooltipProperty } from './es_tooltip_property';
import type { ITooltipProperty } from './tooltip_property';

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
