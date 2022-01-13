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
import { CUSTOM_PALETTE, DEFAULT_CONTINUITY, DEFAULT_RANGE_TYPE } from './constants';

import {
  mergePaletteParams,
  updateRangeType,
  toColorRanges,
  changeColorPalette,
  updatePalette,
} from './utils';

import type { PaletteConfigurationState, PaletteConfigurationActions } from './types';

export const paletteConfigurationReducer: Reducer<
  PaletteConfigurationState,
  PaletteConfigurationActions
> = (state, action) => {
  switch (action.type) {
    case 'updateContinuity': {
      const { continuity, isLast, dataBounds } = action.payload;
      const rangeType = state.activePalette.params?.rangeType ?? DEFAULT_RANGE_TYPE;

      const value = getValueForContinuity(
        state.colorRanges,
        continuity,
        isLast,
        rangeType,
        dataBounds
      );

      const updatedRangeLimit = isLast ? { rangeMax: value } : { rangeMin: value };

      return {
        activePalette: updatePalette(
          state.activePalette,
          {
            continuity,
            ...updatedRangeLimit,
          },
          CUSTOM_PALETTE
        ),
        colorRanges: updateColorRangeValue(
          isLast ? state.colorRanges.length - 1 : 0,
          `${value}`,
          isLast ? 'end' : 'start',
          state.colorRanges
        ),
      };
    }
    case 'addColorRange': {
      const { dataBounds } = action.payload;
      return {
        activePalette: updatePalette(state.activePalette, {}, CUSTOM_PALETTE),
        colorRanges: addColorRange(
          state.colorRanges,
          state.activePalette.params?.rangeType ?? DEFAULT_RANGE_TYPE,
          dataBounds
        ),
      };
    }
    case 'reversePalette': {
      return {
        activePalette: updatePalette(state.activePalette, {}, CUSTOM_PALETTE),
        colorRanges: reversePalette(state.colorRanges),
      };
    }
    case 'distributeEqually': {
      const { dataBounds } = action.payload;
      return {
        activePalette: updatePalette(state.activePalette, {}, CUSTOM_PALETTE),
        colorRanges: distributeEqually(
          state.colorRanges,
          state.activePalette.params?.rangeType,
          state.activePalette.params?.continuity ?? DEFAULT_CONTINUITY,
          dataBounds
        ),
      };
    }
    case 'updateColor': {
      const { index, color } = action.payload;
      return {
        activePalette: updatePalette(state.activePalette, {}, CUSTOM_PALETTE),
        colorRanges: updateColorRangeColor(index, color, state.colorRanges),
      };
    }
    case 'sortColorRanges': {
      const newColorRanges = sortColorRanges(state.colorRanges);
      return {
        activePalette: updatePalette(
          state.activePalette,
          {
            rangeMax: newColorRanges[newColorRanges.length - 1].end,
            rangeMin: newColorRanges[0].start,
          },
          CUSTOM_PALETTE
        ),
        colorRanges: newColorRanges,
      };
    }
    case 'updateValue': {
      const { index, value, accessor } = action.payload;
      const newColorRanges = updateColorRangeValue(index, value, accessor, state.colorRanges);
      return {
        activePalette: updatePalette(
          state.activePalette,
          {
            rangeMax: newColorRanges[newColorRanges.length - 1].end,
            rangeMin: newColorRanges[0].start,
          },
          CUSTOM_PALETTE
        ),
        colorRanges: newColorRanges,
      };
    }
    case 'deleteColorRange': {
      const { index } = action.payload;
      return {
        activePalette: updatePalette(state.activePalette, {}, CUSTOM_PALETTE),
        colorRanges: deleteColorRange(index, state.colorRanges),
      };
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

      return {
        colorRanges: toColorRanges(
          palettes,
          paletteParams.colorStops || [],
          newPalette,
          dataBounds
        ),
        activePalette: newPalette,
      };
    }
    case 'changeColorPalette': {
      const { dataBounds, palettes, palette } = action.payload;
      const newPalette = changeColorPalette(palette, state.activePalette, palettes, dataBounds);
      return {
        colorRanges: toColorRanges(
          palettes,
          newPalette.params?.colorStops || [],
          newPalette,
          dataBounds
        ),
        activePalette: newPalette,
      };
    }
    default:
      throw new Error('wrong action');
  }
};
