/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CustomPaletteParamsConfig } from '../../../../common';

/** @deprecated **/
export type AutoValueMode = 'none' | 'min' | 'max' | 'all';

export interface ColorRange {
  color: string;
  start: number;
  end: number;
  // todo: do we need it?
  id?: string;
}

/** @internal **/
export interface ColorRangeValidation {
  errors: string[];
  isValid: boolean;
}

/** @internal **/
export interface DataBounds {
  min: number;
  max: number;
}

/** @internal **/
export interface ColorRangesState {
  colorRanges: ColorRange[];
  autoValue: AutoValueMode;
}

/** @internal **/
export interface AddColorRangePayload {
  rangeType: CustomPaletteParamsConfig['rangeType'];
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
export type ColorRangesActions =
  | { type: 'reversePalette' }
  | { type: 'sortColorRanges' }
  | { type: 'distributeEqually' }
  | { type: 'set'; payload: ColorRangesState }
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
