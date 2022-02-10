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
  DEFAULT_CONTINUITY,
} from './constants';
import type { ColorRange } from './color_ranges';
import { toColorStops, sortColorRanges } from './color_ranges/utils';
import type { PaletteConfigurationState, DataBounds } from './types';
import type { CustomPaletteParams, ColorStop } from '../../../common';
import {
  checkIsMinContinuity,
  checkIsMaxContinuity,
} from '../../../../../../src/plugins/charts/common';

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

export function updateRangeType(
  newRangeType: CustomPaletteParams['rangeType'],
  activePalette: PaletteConfigurationState['activePalette'],
  dataBounds: DataBounds,
  palettes: PaletteRegistry,
  colorRanges: PaletteConfigurationState['colorRanges']
) {
  const continuity = activePalette.params?.continuity ?? DEFAULT_CONTINUITY;
  const params: CustomPaletteParams = { rangeType: newRangeType };
  const { min: newMin, max: newMax } = getDataMinMax(newRangeType, dataBounds);
  const { min: oldMin, max: oldMax } = getDataMinMax(activePalette.params?.rangeType, dataBounds);
  const newColorStops = getStopsFromColorRangesByNewInterval(colorRanges, {
    oldInterval: oldMax - oldMin,
    newInterval: newMax - newMin,
    newMin,
    oldMin,
  });

  if (activePalette.name === CUSTOM_PALETTE) {
    const stops = getPaletteStops(
      palettes,
      { ...activePalette.params, colorStops: newColorStops, ...params },
      { dataBounds }
    );
    params.colorStops = newColorStops;
    params.stops = stops;
  } else {
    params.stops = getPaletteStops(
      palettes,
      { ...activePalette.params, ...params },
      { prevPalette: activePalette.name, dataBounds }
    );
  }

  const lastStop =
    activePalette.name === CUSTOM_PALETTE
      ? newColorStops[newColorStops.length - 1].stop
      : params.stops[params.stops.length - 1].stop;

  params.rangeMin = checkIsMinContinuity(continuity)
    ? Number.NEGATIVE_INFINITY
    : activePalette.name === CUSTOM_PALETTE
    ? newColorStops[0].stop
    : params.stops[0].stop;

  params.rangeMax = checkIsMaxContinuity(continuity)
    ? Number.POSITIVE_INFINITY
    : activePalette.params?.rangeMax
    ? calculateStop(activePalette.params.rangeMax, newMin, oldMin, oldMax - oldMin, newMax - newMin)
    : lastStop > newMax
    ? lastStop + 1
    : newMax;

  return params;
}

export function changeColorPalette(
  newPalette: PaletteConfigurationState['activePalette'],
  activePalette: PaletteConfigurationState['activePalette'],
  palettes: PaletteRegistry,
  dataBounds: DataBounds,
  disableSwitchingContinuity: boolean
) {
  const isNewPaletteCustom = newPalette.name === CUSTOM_PALETTE;
  const newParams: CustomPaletteParams = {
    ...activePalette.params,
    name: newPalette.name,
    colorStops: undefined,
    continuity: disableSwitchingContinuity
      ? activePalette.params?.continuity ?? DEFAULT_CONTINUITY
      : DEFAULT_CONTINUITY,
    reverse: false, // restore the reverse flag
  };

  // we should pass colorStops so that correct calculate new color stops (if there was before) for custom palette
  const newColorStops = getColorStops(
    palettes,
    activePalette.params?.colorStops || [],
    activePalette,
    dataBounds
  );

  if (isNewPaletteCustom) {
    newParams.colorStops = newColorStops;
  }

  return {
    ...newPalette,
    params: {
      ...newParams,
      stops: getPaletteStops(palettes, newParams, {
        prevPalette:
          isNewPaletteCustom || activePalette.name === CUSTOM_PALETTE ? undefined : newPalette.name,
        dataBounds,
        mapFromMinValue: true,
      }),
      rangeMin: checkIsMinContinuity(newParams.continuity)
        ? Number.NEGATIVE_INFINITY
        : Math.min(dataBounds.min, newColorStops[0].stop),
      rangeMax: checkIsMaxContinuity(newParams.continuity)
        ? Number.POSITIVE_INFINITY
        : Math.min(dataBounds.max, newColorStops[newColorStops.length - 1].stop),
    },
  };
}

export function withUpdatingPalette(
  palettes: PaletteRegistry,
  activePalette: PaletteConfigurationState['activePalette'],
  colorRanges: ColorRange[],
  dataBounds: DataBounds,
  continuity?: CustomPaletteParams['continuity']
) {
  const currentContinuity = continuity ?? activePalette.params?.continuity ?? DEFAULT_CONTINUITY;
  let sortedColorRanges = colorRanges;
  if (
    colorRanges.some((value, index) =>
      index !== colorRanges.length - 1 ? value.start > colorRanges[index + 1].start : false
    )
  ) {
    sortedColorRanges = sortColorRanges(colorRanges);
  }

  const { max, colorStops } = toColorStops(sortedColorRanges, currentContinuity);

  const newPallete = getSwitchToCustomParams(
    palettes,
    activePalette!,
    {
      continuity: currentContinuity,
      colorStops,
      steps: activePalette!.params?.steps || DEFAULT_COLOR_STEPS,
      reverse: activePalette!.params?.reverse,
      rangeMin: colorStops[0]?.stop,
      rangeMax: max,
    },
    dataBounds!
  );

  return {
    activePalette: newPallete,
    colorRanges,
  };
}

export function withUpdatingColorRanges(
  palettes: PaletteRegistry,
  activePalette: PaletteConfigurationState['activePalette'],
  dataBounds: DataBounds
) {
  return {
    colorRanges: toColorRanges(
      palettes,
      activePalette.params?.colorStops || [],
      activePalette,
      dataBounds
    ),
    activePalette,
  };
}

export function applyPaletteParams<T extends PaletteOutput<CustomPaletteParams>>(
  palettes: PaletteRegistry,
  activePalette: T,
  dataBounds: DataBounds
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

/** @internal **/
export function calculateStop(
  stopValue: number,
  newMin: number,
  oldMin: number,
  oldInterval: number,
  newInterval: number
) {
  if (oldInterval === 0) {
    return newInterval + newMin;
  }
  return roundValue(newMin + ((stopValue - oldMin) * newInterval) / oldInterval);
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
      stop: calculateStop(stop, newMin, oldMin, oldInterval, newInterval),
    };
  });
}

// Utility to remap color stops within new domain
export function getStopsFromColorRangesByNewInterval(
  colorRanges: ColorRange[],
  {
    newInterval,
    oldInterval,
    newMin,
    oldMin,
  }: { newInterval: number; oldInterval: number; newMin: number; oldMin: number }
) {
  return (colorRanges || []).map(({ color, start }) => {
    let stop = calculateStop(start, newMin, oldMin, oldInterval, newInterval);

    if (oldInterval === 0) {
      stop = newInterval + newMin;
    }

    return {
      color,
      stop: roundValue(stop),
    };
  });
}

function getOverallMinMax(params: CustomPaletteParams | undefined, dataBounds: DataBounds) {
  const { min: dataMin, max: dataMax } = getDataMinMax(params?.rangeType, dataBounds);
  const minStopValue = params?.colorStops?.[0]?.stop ?? Number.POSITIVE_INFINITY;
  const maxStopValue =
    params?.colorStops?.[params.colorStops.length - 1]?.stop ?? Number.NEGATIVE_INFINITY;
  const overallMin = Math.min(dataMin, minStopValue);
  const overallMax = Math.max(dataMax, maxStopValue);
  return { min: overallMin, max: overallMax };
}

export function getDataMinMax(
  rangeType: CustomPaletteParams['rangeType'] | undefined,
  dataBounds: DataBounds
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
    dataBounds: DataBounds;
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

  const newStopsMin = mapFromMinValue || interval === 0 ? minValue : interval / steps;

  return remapStopsByNewInterval(
    colorStopsFromPredefined.map((color, index) => ({ color, stop: index })),
    {
      newInterval: interval,
      oldInterval: colorStopsFromPredefined.length,
      newMin: newStopsMin,
      oldMin: 0,
    }
  );
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

export function roundValue(value: number, fractionDigits: number = 2) {
  return Number((Math.floor(value * 100) / 100).toFixed(fractionDigits));
}

// very simple heuristic: pick last two stops and compute a new stop based on the same distance
// if the new stop is above max, then reduce the step to reach max, or if zero then just 1.
//
// it accepts two series of stops as the function is used also when computing stops from colorStops
export function getStepValue(colorStops: ColorStop[], newColorStops: ColorStop[], max: number) {
  const length = newColorStops.length;
  // workout the steps from the last 2 items
  const dataStep =
    length > 1 ? newColorStops[length - 1].stop - newColorStops[length - 2].stop || 1 : 1;
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
  dataBounds: DataBounds
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
  dataBounds: DataBounds
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

/**
 * Both table coloring logic and EuiPaletteDisplay format implementation works differently than our current `colorStops`,
 * by having the stop values at the end of each color segment rather than at the beginning: `stops` values are computed by a rightShift of `colorStops`.
 * EuiPaletteDisplay has an additional requirement as it is always mapped against a domain [0, N]: from `stops` the `displayStops` are computed with
 * some continuity enrichment and a remap against a [0, 100] domain to make the palette component work ok.
 *
 * These naming conventions would be useful to track the code flow in this feature as multiple transformations are happening
 * for a single change.
 */
export function toColorRanges(
  palettes: PaletteRegistry,
  colorStops: CustomPaletteParams['colorStops'],
  activePalette: PaletteOutput<CustomPaletteParams>,
  dataBounds: DataBounds
) {
  const {
    continuity = defaultPaletteParams.continuity,
    rangeType = defaultPaletteParams.rangeType,
  } = activePalette.params ?? {};
  const { min: dataMin, max: dataMax } = getDataMinMax(rangeType, dataBounds);

  return getColorStops(palettes, colorStops || [], activePalette, dataBounds).map(
    (colorStop, index, array) => {
      const isFirst = index === 0;
      const isLast = index === array.length - 1;

      return {
        color: colorStop.color,
        start:
          isFirst && checkIsMinContinuity(continuity)
            ? Number.NEGATIVE_INFINITY
            : colorStop.stop ?? activePalette.params?.rangeMin ?? dataMin,
        end:
          isLast && checkIsMaxContinuity(continuity)
            ? Number.POSITIVE_INFINITY
            : array[index + 1]?.stop ?? activePalette.params?.rangeMax ?? dataMax,
      };
    }
  );
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

function getId(id: string) {
  return id;
}

export function getNumericValue(rowValue: number | number[] | undefined) {
  if (rowValue == null || Array.isArray(rowValue)) {
    return;
  }
  return rowValue;
}

export const getFallbackDataBounds = (
  rangeType: CustomPaletteParams['rangeType'] = 'percent'
): DataBounds =>
  rangeType === 'percent'
    ? {
        min: 0,
        max: 100,
        fallback: true,
      }
    : {
        min: 1,
        max: 1,
        fallback: true,
      };

export const findMinMaxByColumnId = (
  columnIds: string[],
  table: Datatable | undefined,
  getOriginalId: (id: string) => string = getId
) => {
  const minMax: Record<string, DataBounds> = {};

  if (table != null) {
    for (const columnId of columnIds) {
      const originalId = getOriginalId(columnId);
      minMax[originalId] = minMax[originalId] || {
        max: Number.NEGATIVE_INFINITY,
        min: Number.POSITIVE_INFINITY,
      };
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
      if (minMax[originalId].max === Number.NEGATIVE_INFINITY) {
        minMax[originalId] = getFallbackDataBounds();
      }
    }
  }
  return minMax;
};
