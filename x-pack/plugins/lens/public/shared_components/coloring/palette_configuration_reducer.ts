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
  getValueForContinuity,
} from './color_ranges/utils';
import { DEFAULT_CONTINUITY, DEFAULT_RANGE_TYPE } from './constants';

import {
  mergePaletteParams,
  updateRangeType,
  changeColorPalette,
  withUpdatingPalette,
  withUpdatingColorRanges,
} from './utils';

import type { PaletteConfigurationState, PaletteConfigurationActions } from './types';

export const paletteConfigurationReducer: Reducer<
  PaletteConfigurationState,
  PaletteConfigurationActions
> = (state, action) => {
  switch (action.type) {
    case 'updateContinuity': {
      const { continuity, isLast, dataBounds, palettes } = action.payload;
      const rangeType = state.activePalette.params?.rangeType ?? DEFAULT_RANGE_TYPE;

      const value = getValueForContinuity(
        state.colorRanges,
        continuity,
        isLast,
        rangeType,
        dataBounds
      );

      return withUpdatingPalette(
        palettes!,
        state.activePalette,
        updateColorRangeValue(
          isLast ? state.colorRanges.length - 1 : 0,
          `${value}`,
          isLast ? 'end' : 'start',
          state.colorRanges
        ),
        dataBounds,
        continuity
      );
    }
    case 'addColorRange': {
      const { dataBounds, palettes } = action.payload;
      return withUpdatingPalette(
        palettes!,
        state.activePalette,
        addColorRange(
          state.colorRanges,
          state.activePalette.params?.rangeType ?? DEFAULT_RANGE_TYPE,
          dataBounds
        ),
        dataBounds
      );
    }
    case 'reversePalette': {
      const { dataBounds, palettes } = action.payload;
      return withUpdatingPalette(
        palettes!,
        state.activePalette,
        reversePalette(state.colorRanges),
        dataBounds
      );
    }
    case 'distributeEqually': {
      const { dataBounds, palettes } = action.payload;
      return withUpdatingPalette(
        palettes!,
        state.activePalette,
        distributeEqually(
          state.colorRanges,
          state.activePalette.params?.rangeType,
          state.activePalette.params?.continuity ?? DEFAULT_CONTINUITY,
          dataBounds
        ),
        dataBounds
      );
    }
    case 'updateColor': {
      const { index, color, palettes, dataBounds } = action.payload;
      return withUpdatingPalette(
        palettes!,
        state.activePalette,
        updateColorRangeColor(index, color, state.colorRanges),
        dataBounds
      );
    }
    case 'sortColorRanges': {
      const { dataBounds, palettes } = action.payload;
      return withUpdatingPalette(
        palettes!,
        state.activePalette,
        sortColorRanges(state.colorRanges),
        dataBounds
      );
    }
    case 'updateValue': {
      const { index, value, accessor, dataBounds, palettes } = action.payload;
      return withUpdatingPalette(
        palettes!,
        state.activePalette,
        updateColorRangeValue(index, value, accessor, state.colorRanges),
        dataBounds
      );
    }
    case 'deleteColorRange': {
      const { index, dataBounds, palettes } = action.payload;
      return withUpdatingPalette(
        palettes!,
        state.activePalette,
        deleteColorRange(index, state.colorRanges),
        dataBounds
      );
    }
    case 'updateRangeType': {
      const { dataBounds, palettes, rangeType } = action.payload;
      const paletteParams = updateRangeType(
        rangeType,
        state.activePalette,
        dataBounds,
        palettes,
        state.colorRanges
      );

      const newPalette = mergePaletteParams(state.activePalette, paletteParams);

      return withUpdatingColorRanges(palettes, newPalette, dataBounds);
    }
    case 'changeColorPalette': {
      const { dataBounds, palettes, palette, disableSwitchingContinuity } = action.payload;
      const newPalette = changeColorPalette(
        palette,
        state.activePalette,
        palettes,
        dataBounds,
        disableSwitchingContinuity
      );
      return withUpdatingColorRanges(palettes, newPalette, dataBounds);
    }
    default:
      throw new Error('wrong action');
  }
};
