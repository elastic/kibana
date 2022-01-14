/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CustomPaletteParams } from '../../../../common';
import type { PaletteContinuity } from '../../../../../../../src/plugins/charts/common';
import type { DataBounds } from '../types';

export interface ColorRange {
  color: string;
  start: number;
  end: number;
}

/** @internal **/
export interface ColorRangesState {
  colorRanges: ColorRange[];
  rangeType: CustomPaletteParams['rangeType'];
  continuity: PaletteContinuity;
}

/** @internal **/
export interface AddColorRangePayload {
  dataBounds: DataBounds;
}

/** @internal **/
export interface DistributeEquallyPayload {
  dataBounds: DataBounds;
}

/** @internal **/
export interface UpdateColorPayload {
  index: number;
  color: string;
}

/** @internal **/
export interface UpdateColorRangeValuePayload {
  index: number;
  value: string;
  accessor: ColorRangeAccessor;
}

/** @internal **/
export interface DeleteColorRangePayload {
  index: number;
}

/** @internal **/
export interface UpdateContinuityPayload {
  isLast: boolean;
  continuity: PaletteContinuity;
  dataBounds: DataBounds;
}

/** @internal **/
export type ColorRangesActions =
  | { type: 'reversePalette' }
  | { type: 'sortColorRanges' }
  | { type: 'distributeEqually'; payload: DistributeEquallyPayload }
  | { type: 'updateContinuity'; payload: UpdateContinuityPayload }
  | { type: 'deleteColorRange'; payload: DeleteColorRangePayload }
  | {
      type: 'addColorRange';
      payload: AddColorRangePayload;
    }
  | { type: 'updateColor'; payload: UpdateColorPayload }
  | {
      type: 'updateValue';
      payload: UpdateColorRangeValuePayload;
    };

/** @internal **/
export type ColorRangeAccessor = 'start' | 'end';
