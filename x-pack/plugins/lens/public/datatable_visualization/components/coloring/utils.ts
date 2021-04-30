/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidHex } from '@elastic/eui';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { CustomPaletteParams } from '../../expression';
import {
  ColorStop,
  defaultParams,
  DEFAULT_COLOR_STEPS,
  DEFAULT_CUSTOM_STEPS,
  DEFAULT_MAX_STOP,
  DEFAULT_MIN_STOP,
  RequiredPaletteParamTypes,
} from './constants';

// Need to shift the Custom palette in order to correctly visualize it when in display mode
export function shiftPalette(stops: Required<CustomPaletteParams>['stops']) {
  // shift everything right and add an additional stop at the end
  const result = stops.map((entry, i, array) => ({
    ...entry,
    stop: i + 1 < array.length ? array[i + 1].stop : DEFAULT_MAX_STOP,
  }));
  if (stops[stops.length - 1].stop === DEFAULT_MAX_STOP) {
    // pop out the last value (to void any conflict)
    result.pop();
  }
  return result;
}

// Utility to remap color stops within new domain
export function remapStopsByNewInterval(
  controlStops: Required<CustomPaletteParams>['stops'],
  { newInterval, newMin }: { newInterval: number; newMin: number }
) {
  const prevMin = controlStops[0].stop;
  const oldInterval = controlStops[controlStops.length - 1].stop - prevMin;
  return (controlStops || []).map(({ color, stop }) => {
    return {
      color,
      stop: newMin + ((stop - prevMin) * newInterval) / oldInterval,
    };
  });
}

export function areStopsUpToDate(
  controlStops: Required<CustomPaletteParams>['stops'],
  { min, max }: { min: number; max: number }
) {
  if (!controlStops.length) {
    return true;
  }
  const prevMin = controlStops[0].stop;
  const prevMax = controlStops[controlStops.length - 1].stop;
  return prevMin === min || prevMax === max;
}

export function ensureStopsAreUpToDate(
  { stops, range }: { stops: number[]; range: Required<CustomPaletteParams>['rangeType'] },
  minMax: { min: number; max: number }
) {
  const prevMin = stops[0];
  const prevMax = stops[stops.length - 1];
  if (range !== 'auto' || (prevMin === minMax.min && prevMax === minMax.max)) {
    return stops;
  }
  // stops information may be old, so remaps when in auto
  const oldInterval = prevMax - prevMin;
  const newInterval = minMax.max - minMax.min;
  return (stops || []).map((stop) => minMax.min + ((stop - prevMin) * newInterval) / oldInterval);
}

export function getCurrentMinMax(params: CustomPaletteParams | undefined) {
  const minStopValue =
    params?.controlStops?.[0]?.stop ?? params?.rangeMin ?? defaultParams.rangeMin;
  const maxStopValue =
    params?.controlStops?.[params.controlStops.length - 1]?.stop ??
    params?.rangeMax ??
    defaultParams.rangeMax;
  return { min: minStopValue, max: maxStopValue };
}

export function getPaletteColors(
  palettes: PaletteRegistry,
  activePaletteParams: CustomPaletteParams,
  // used to customize color resolution
  { prevPalette }: { prevPalette?: string } = {}
) {
  const isCustomPalette = activePaletteParams.name === 'custom';

  // compute the stopFactor based on steps value. Fallback to default if not defined yet
  const steps =
    activePaletteParams.steps ?? (isCustomPalette ? DEFAULT_CUSTOM_STEPS : DEFAULT_COLOR_STEPS);
  const { min: minStopValue, max: maxStopValue } = getCurrentMinMax(activePaletteParams);
  const interval = maxStopValue - minStopValue;
  const currentStops = activePaletteParams?.stops;
  // If stops are already declared just return them
  if (
    currentStops != null &&
    activePaletteParams?.controlStops?.length &&
    // make sure to regenerate if the user changes number of steps
    currentStops.length === steps &&
    currentStops[0].stop === minStopValue &&
    currentStops[currentStops.length - 1].stop === maxStopValue
  ) {
    return currentStops;
  }

  const { stops, ...otherParams } = activePaletteParams || {};

  const params: Omit<CustomPaletteParams, 'stops'> & {
    stepped?: boolean;
    stops?: number[];
    colors?: string[];
  } = {
    ...otherParams,
    colors: activePaletteParams.controlStops?.map(({ color }) => color),
    stops: activePaletteParams.controlStops?.map(({ stop }) => stop),
    stepped: activePaletteParams?.progression === 'stepped',
  };

  const colorStops = palettes
    .get(prevPalette || activePaletteParams?.name || defaultParams.name)
    .getCategoricalColors(activePaletteParams?.steps || defaultParams.steps, params);

  const remappedColors = remapStopsByNewInterval(
    colorStops.map((color, index) => ({ color, stop: index })),
    { newInterval: interval, newMin: minStopValue }
  );
  return remappedColors;
}

export function reversePalette(paletteColorRepresentation: CustomPaletteParams['stops'] = []) {
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

export function remapForDisplay(
  stops: Required<CustomPaletteParams>['stops'],
  params: CustomPaletteParams,
  { forceRemap }: { forceRemap?: boolean } = {}
) {
  if (params.name === 'custom' || forceRemap) {
    return shiftPalette(
      remapStopsByNewInterval(stops, {
        newInterval: DEFAULT_MAX_STOP,
        newMin: DEFAULT_MIN_STOP,
      })
    );
  }
  return stops;
}

export function isValidColor(colorString: string) {
  return colorString !== '' && isValidHex(colorString);
}
