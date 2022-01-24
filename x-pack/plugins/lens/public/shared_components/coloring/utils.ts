/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chroma from 'chroma-js';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';
import { isColorDark } from '@elastic/eui';
import type { Datatable } from 'src/plugins/expressions/public';
import {
  CUSTOM_PALETTE,
  defaultPaletteParams,
  DEFAULT_COLOR_STEPS,
  DEFAULT_MAX_STOP,
  DEFAULT_MIN_STOP,
} from './constants';
import type { CustomPaletteParams, ColorStop } from '../../../common';

/**
 * Some name conventions here:
 * * `displayStops` => It's an additional transformation of `stops` into a [0, N] domain for the EUIPaletteDisplay component.
 * * `stops` => final steps used to table coloring. It is a rightShift of the colorStops
 * * `colorStops` => user's color stop inputs.  Used to compute range min.
 *
 * When the user inputs the colorStops, they are designed to be the initial part of the color segment,
 * so the next stops indicate where the previous stop ends.
 * Both table coloring logic and EuiPaletteDisplay format implementation works differently than our current `colorStops`,
 * by having the stop values at the end of each color segment rather than at the beginning: `stops` values are computed by a rightShift of `colorStops`.
 * EuiPaletteDisplay has an additional requirement as it is always mapped against a domain [0, N]: from `stops` the `displayStops` are computed with
 * some continuity enrichment and a remap against a [0, 100] domain to make the palette component work ok.
 *
 * These naming conventions would be useful to track the code flow in this feature as multiple transformations are happening
 * for a single change.
 */

export function applyPaletteParams<T extends PaletteOutput<CustomPaletteParams>>(
  palettes: PaletteRegistry,
  activePalette: T,
  dataBounds: { min: number; max: number }
) {
  // make a copy of it as they have to be manipulated later on
  const displayStops = getPaletteStops(palettes, activePalette?.params || {}, {
    dataBounds,
    defaultPaletteName: activePalette?.name,
  });

  if (activePalette?.params?.reverse && activePalette?.params?.name !== CUSTOM_PALETTE) {
    return reversePalette(displayStops);
  }
  return displayStops;
}

// Need to shift the Custom palette in order to correctly visualize it when in display mode
export function shiftPalette(stops: ColorStop[], max: number) {
  // shift everything right and add an additional stop at the end
  const result = stops.map((entry, i, array) => ({
    ...entry,
    stop: i + 1 < array.length ? array[i + 1].stop : max,
  }));
  if (stops[stops.length - 1].stop === max) {
    // extends the range by a fair amount to make it work the extra case for the last stop === max
    const computedStep = getStepValue(stops, result, max) || 1;
    // do not go beyond the unit step in this case
    const step = Math.min(1, computedStep);
    result[stops.length - 1].stop = max + step;
  }
  return result;
}

// Utility to remap color stops within new domain
export function remapStopsByNewInterval(
  controlStops: ColorStop[],
  {
    newInterval,
    oldInterval,
    newMin,
    oldMin,
  }: { newInterval: number; oldInterval: number; newMin: number; oldMin: number }
) {
  return (controlStops || []).map(({ color, stop }) => {
    return {
      color,
      stop: newMin + ((stop - oldMin) * newInterval) / oldInterval,
    };
  });
}

function getOverallMinMax(
  params: CustomPaletteParams | undefined,
  dataBounds: { min: number; max: number }
) {
  const { min: dataMin, max: dataMax } = getDataMinMax(params?.rangeType, dataBounds);
  const minStopValue = params?.colorStops?.[0]?.stop ?? Infinity;
  const maxStopValue = params?.colorStops?.[params.colorStops.length - 1]?.stop ?? -Infinity;
  const overallMin = Math.min(dataMin, minStopValue);
  const overallMax = Math.max(dataMax, maxStopValue);
  return { min: overallMin, max: overallMax };
}

export function getDataMinMax(
  rangeType: CustomPaletteParams['rangeType'] | undefined,
  dataBounds: { min: number; max: number }
) {
  const dataMin = rangeType === 'number' ? dataBounds.min : DEFAULT_MIN_STOP;
  const dataMax = rangeType === 'number' ? dataBounds.max : DEFAULT_MAX_STOP;
  return { min: dataMin, max: dataMax };
}

/**
 * This is a generic function to compute stops from the current parameters.
 */
export function getPaletteStops(
  palettes: PaletteRegistry,
  activePaletteParams: CustomPaletteParams,
  // used to customize color resolution
  {
    prevPalette,
    dataBounds,
    mapFromMinValue,
    defaultPaletteName,
  }: {
    prevPalette?: string;
    dataBounds: { min: number; max: number };
    mapFromMinValue?: boolean;
    defaultPaletteName?: string;
  }
) {
  const { min: minValue, max: maxValue } = getOverallMinMax(activePaletteParams, dataBounds);
  const interval = maxValue - minValue;
  const { stops: currentStops, ...otherParams } = activePaletteParams || {};

  if (activePaletteParams.name === 'custom' && activePaletteParams?.colorStops) {
    // need to generate the palette from the existing controlStops
    return shiftPalette(activePaletteParams.colorStops, maxValue);
  }

  const steps = activePaletteParams?.steps || defaultPaletteParams.steps;
  // generate a palette from predefined ones and customize the domain
  const colorStopsFromPredefined = palettes
    .get(
      prevPalette || activePaletteParams?.name || defaultPaletteName || defaultPaletteParams.name
    )
    .getCategoricalColors(steps, otherParams);

  const newStopsMin = mapFromMinValue ? minValue : interval / steps;

  const stops = remapStopsByNewInterval(
    colorStopsFromPredefined.map((color, index) => ({ color, stop: index })),
    {
      newInterval: interval,
      oldInterval: colorStopsFromPredefined.length,
      newMin: newStopsMin,
      oldMin: 0,
    }
  );
  return stops;
}

export function reversePalette(paletteColorRepresentation: ColorStop[] = []) {
  const stops = paletteColorRepresentation.map(({ stop }) => stop);
  return paletteColorRepresentation
    .map(({ color }, i) => ({
      color,
      stop: stops[paletteColorRepresentation.length - i - 1],
    }))
    .reverse();
}

export function mergePaletteParams(
  activePalette: PaletteOutput<CustomPaletteParams>,
  newParams: CustomPaletteParams
): PaletteOutput<CustomPaletteParams> {
  return {
    ...activePalette,
    params: {
      ...activePalette.params,
      ...newParams,
    },
  };
}

function isValidPonyfill(colorString: string) {
  // we're using an old version of chroma without the valid function
  try {
    chroma(colorString);
    return true;
  } catch (e) {
    return false;
  }
}

export function isValidColor(colorString: string) {
  // chroma can handle also hex values with alpha channel/transparency
  // chroma accepts also hex without #, so test for it
  return colorString !== '' && /^#/.test(colorString) && isValidPonyfill(colorString);
}

export function roundStopValues(colorStops: ColorStop[]) {
  return colorStops.map(({ color, stop }) => {
    // when rounding mind to not go in excess, rather use the floor function
    const roundedStop = Number((Math.floor(stop * 100) / 100).toFixed(2));
    return { color, stop: roundedStop };
  });
}

// very simple heuristic: pick last two stops and compute a new stop based on the same distance
// if the new stop is above max, then reduce the step to reach max, or if zero then just 1.
//
// it accepts two series of stops as the function is used also when computing stops from colorStops
export function getStepValue(colorStops: ColorStop[], newColorStops: ColorStop[], max: number) {
  const length = newColorStops.length;
  // workout the steps from the last 2 items
  const dataStep = newColorStops[length - 1].stop - newColorStops[length - 2].stop || 1;
  let step = Number(dataStep.toFixed(2));
  if (max < colorStops[length - 1].stop + step) {
    const diffToMax = max - colorStops[length - 1].stop;
    // if the computed step goes way out of bound, fallback to 1, otherwise reach max
    step = diffToMax > 0 ? diffToMax : 1;
  }
  return step;
}

export function getSwitchToCustomParams(
  palettes: PaletteRegistry,
  activePalette: PaletteOutput<CustomPaletteParams>,
  newParams: CustomPaletteParams,
  dataBounds: { min: number; max: number }
) {
  // if it's already a custom palette just return the params
  if (activePalette?.params?.name === CUSTOM_PALETTE) {
    const stops = getPaletteStops(
      palettes,
      {
        steps: DEFAULT_COLOR_STEPS,
        ...activePalette.params,
        ...newParams,
      },
      {
        dataBounds,
      }
    );
    return mergePaletteParams(activePalette, {
      ...newParams,
      stops,
    });
  }
  // prepare everything to switch to custom palette
  const newPaletteParams = {
    steps: DEFAULT_COLOR_STEPS,
    ...activePalette.params,
    ...newParams,
    name: CUSTOM_PALETTE,
  };

  const stops = getPaletteStops(palettes, newPaletteParams, {
    prevPalette: newPaletteParams.colorStops ? undefined : activePalette.name,
    dataBounds,
  });
  return mergePaletteParams(
    { name: CUSTOM_PALETTE, type: 'palette' },
    {
      ...newPaletteParams,
      stops,
    }
  );
}

export function getColorStops(
  palettes: PaletteRegistry,
  colorStops: Required<CustomPaletteParams>['stops'],
  activePalette: PaletteOutput<CustomPaletteParams>,
  dataBounds: { min: number; max: number }
) {
  // just forward the current stops if custom
  if (activePalette?.name === CUSTOM_PALETTE && colorStops?.length) {
    return colorStops;
  }
  // for predefined palettes create some stops, then drop the last one.
  // we're using these as starting point for the user
  let freshColorStops = getPaletteStops(
    palettes,
    { ...activePalette?.params },
    // mapFromMinValue is a special flag to offset the stops values
    // used here to avoid a new remap/left shift
    { dataBounds, mapFromMinValue: true, defaultPaletteName: activePalette.name }
  );
  if (activePalette?.params?.reverse) {
    freshColorStops = reversePalette(freshColorStops);
  }
  return freshColorStops;
}

export function getContrastColor(
  color: string,
  isDarkTheme: boolean,
  darkTextProp: 'euiColorInk' | 'euiTextColor' = 'euiColorInk',
  lightTextProp: 'euiColorGhost' | 'euiTextColor' = 'euiColorGhost'
) {
  // when in light theme both text color and colorInk are dark and the choice
  // may depends on the specific context.
  const darkColor = isDarkTheme ? euiDarkVars.euiColorInk : euiLightVars[darkTextProp];
  // Same thing for light color in dark theme
  const lightColor = isDarkTheme ? euiDarkVars[lightTextProp] : euiLightVars.euiColorGhost;
  const backgroundColor = isDarkTheme
    ? euiDarkVars.euiPageBackgroundColor
    : euiLightVars.euiPageBackgroundColor;
  const finalColor =
    chroma(color).alpha() < 1 ? chroma.blend(backgroundColor, color, 'overlay') : chroma(color);
  return isColorDark(...finalColor.rgb()) ? lightColor : darkColor;
}

/**
 * Same as stops, but remapped against a range 0-100
 */
export function getStopsForFixedMode(stops: ColorStop[], colorStops?: ColorStop[]) {
  const referenceStops =
    colorStops || stops.map(({ color }, index) => ({ color, stop: 20 * index }));
  const fallbackStops = stops;

  // what happens when user set two stops with the same value? we'll fallback to the display interval
  const oldInterval =
    referenceStops[referenceStops.length - 1].stop - referenceStops[0].stop ||
    fallbackStops[fallbackStops.length - 1].stop - fallbackStops[0].stop;

  return remapStopsByNewInterval(stops, {
    newInterval: 100,
    oldInterval,
    newMin: 0,
    oldMin: referenceStops[0].stop,
  });
}

function getId(id: string) {
  return id;
}

export function getNumericValue(rowValue: number | number[] | undefined) {
  if (rowValue == null || Array.isArray(rowValue)) {
    return;
  }
  return rowValue;
}

export const findMinMaxByColumnId = (
  columnIds: string[],
  table: Datatable | undefined,
  getOriginalId: (id: string) => string = getId
) => {
  const minMax: Record<string, { min: number; max: number; fallback?: boolean }> = {};

  if (table != null) {
    for (const columnId of columnIds) {
      const originalId = getOriginalId(columnId);
      minMax[originalId] = minMax[originalId] || { max: -Infinity, min: Infinity };
      table.rows.forEach((row) => {
        const rowValue = row[columnId];
        const numericValue = getNumericValue(rowValue);
        if (numericValue != null) {
          if (minMax[originalId].min > numericValue) {
            minMax[originalId].min = numericValue;
          }
          if (minMax[originalId].max < numericValue) {
            minMax[originalId].max = numericValue;
          }
        }
      });
      // what happens when there's no data in the table? Fallback to a percent range
      if (minMax[originalId].max === -Infinity) {
        minMax[originalId] = { max: 100, min: 0, fallback: true };
      }
    }
  }
  return minMax;
};
