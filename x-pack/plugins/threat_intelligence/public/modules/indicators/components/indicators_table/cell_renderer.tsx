/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_VALUE } from '../../../../../common/constants';
import { Indicator, RawIndicatorFieldId } from '../../../../../common/types/Indicator';
import { displayValue } from '../../lib/display_value';
import { unwrapValue } from '../../lib/unwrap_value';

export enum ComputedIndicatorFieldId {
  DisplayValue = 'display_value',
}

export const cellRendererFactory = (indicators: Indicator[], from: number) => {
  return ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
    const indicator = indicators[rowIndex - from];

    if (!indicator) {
      return null;
    }

    if (columnId === ComputedIndicatorFieldId.DisplayValue) {
      return displayValue(indicator) || EMPTY_VALUE;
    }

    return unwrapValue(indicator, columnId as RawIndicatorFieldId) || EMPTY_VALUE;
  };
};
