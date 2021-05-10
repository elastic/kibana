/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidHex } from '@elastic/eui';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { CustomPaletteParams } from '../../expression';
import { ColorStop, defaultParams, DEFAULT_MAX_STOP, DEFAULT_MIN_STOP } from './constants';

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
  }: { prevPalette?: string; dataBounds: { min: number; max: number }; mapFromMinValue?: boolean }
) {
  const { min: minValue, max: maxValue } = getOverallMinMax(activePaletteParams, dataBounds);
  const interval = maxValue - minValue;
  const { stops: currentStops, ...otherParams } = activePaletteParams || {};

  if (activePaletteParams.name === 'custom' && activePaletteParams?.colorStops) {
    // need to generate the palette from the existing controlStops
    return shiftPalette(activePaletteParams.colorStops, maxValue);
  }
  // generate a palette from predefined ones and customize the domain
  const colorStopsFromPredefined = palettes
    .get(prevPalette || activePaletteParams?.name || defaultParams.name)
    .getCategoricalColors(defaultParams.steps, otherParams);

  const newStopsMin = mapFromMinValue ? minValue : interval / defaultParams.steps;

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

// ControlStops are ColorStops with continuity values
export function getControlStops(
  colorStops: ColorStop[],
  params: CustomPaletteParams,
  { dataBounds }: { dataBounds: { min: number; max: number } }
) {
  const newStops: ColorStop[] = [];
  const { min: minRef, max: maxRef } = getDataMinMax(params.rangeType, dataBounds);
  const minStop = colorStops[0].stop;
  if (minStop > minRef) {
    if (params.continuity === 'below' || params.continuity === 'all') {
      newStops.push({
        color: colorStops[0].color,
        stop: colorStops[0]?.stop || minRef,
      });
    }
  }
  newStops.push(...colorStops);
  if (minStop < maxRef) {
    if (params.continuity == null || params.continuity === 'above' || params.continuity === 'all') {
      newStops.push({
        color: colorStops[colorStops.length - 1].color,
        stop: maxRef,
      });
    }
  }
}

export function isValidColor(colorString: string) {
  return colorString !== '' && isValidHex(colorString);
}

function shouldRoundDigits(value: number) {
  return !Number.isInteger(value);
}

export function roundStopValues(colorStops: ColorStop[]) {
  return colorStops.map(({ color, stop }) => {
    const roundedStop = shouldRoundDigits(stop) ? Number(stop.toFixed(2)) : stop;
    return { color, stop: roundedStop };
  });
}

export function getStepValue(colorStops: ColorStop[], newColorStops: ColorStop[], max: number) {
  const length = newColorStops.length;
  // workout the steps from the last 2 items
  const dataStep = newColorStops[length - 1].stop - newColorStops[length - 2].stop || 1;
  let step = shouldRoundDigits(dataStep) ? Number(dataStep.toFixed(2)) : dataStep;
  if (max < colorStops[length - 1].stop + step) {
    const diffToMax = max - colorStops[length - 1].stop;
    // if the computed step goes way out of bound, fallback to 1, otherwise reach max
    step = diffToMax > 0 ? diffToMax : 1;
  }
  return step;
}
