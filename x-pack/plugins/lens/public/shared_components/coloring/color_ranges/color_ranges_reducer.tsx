/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reducer } from 'react';
import {
  addColorRange,
  deleteColorRange,
  distributeEqually,
  reversePalette,
  sortColorRanges,
  updateColorRangeColor,
  updateColorRangeValue,
} from './utils';

import type {
  SetColorRangesPayload,
  ColorRangesActions,
  ColorRangesState,
  AddColorRangePayload,
  UpdateColorPayload,
  UpdateColorRangeValuePayload,
  DeleteColorRangePayload,
  DistributeEquallyPayload,
} from './types';

export const colorRangesReducer: Reducer<ColorRangesState, ColorRangesActions> = (
  state,
  action
) => {
  switch (action.type) {
    case 'set': {
      const payload = action.payload as SetColorRangesPayload;

      return {
        colorRanges: payload.colorRanges ?? state.colorRanges,
        continuity: payload.continuity ?? state.continuity,
        rangeType: payload.rangeType ?? state.rangeType,
      };
    }
    case 'addColorRange': {
      const { dataBounds } = action.payload as AddColorRangePayload;
      return {
        ...state,
        colorRanges: addColorRange(state.colorRanges, state.rangeType, dataBounds),
      };
    }
    case 'reversePalette': {
      return {
        ...state,
        colorRanges: reversePalette(state.colorRanges),
      };
    }
    case 'distributeEqually': {
      const { dataBounds } = action.payload as DistributeEquallyPayload;
      return {
        ...state,
        colorRanges: distributeEqually(
          state.colorRanges,
          state.rangeType,
          state.continuity,
          dataBounds
        ),
      };
    }
    case 'updateColor': {
      const { index, color } = action.payload as UpdateColorPayload;
      return {
        ...state,
        colorRanges: updateColorRangeColor(index, color, state.colorRanges),
      };
    }
    case 'sortColorRanges': {
      return {
        ...state,
        colorRanges: sortColorRanges(state.colorRanges),
      };
    }
    case 'updateValue': {
      const { index, value, accessor } = action.payload as UpdateColorRangeValuePayload;
      return {
        ...state,
        colorRanges: updateColorRangeValue(index, value, accessor, state.colorRanges),
      };
    }
    case 'deleteColorRange': {
      const { index } = action.payload as DeleteColorRangePayload;
      return {
        ...state,
        colorRanges: deleteColorRange(index, state.colorRanges),
      };
    }
    default:
      throw new Error('wrong action');
  }
};
