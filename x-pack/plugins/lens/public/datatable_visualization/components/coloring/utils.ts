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
    // pop out the last value (to void any conflict)
    result.pop();
  }
  return result;
}

// Utility to remap color stops within new domain
export function remapStopsByNewInterval(
  controlStops: ColorStop[],
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

export function getCurrentMinMax(
  params: CustomPaletteParams | undefined,
  dataBounds: { min: number; max: number }
) {
  const dataMin = params?.rangeType === 'number' ? dataBounds.min : DEFAULT_MIN_STOP;
  const dataMax = params?.rangeType === 'number' ? dataBounds.max : DEFAULT_MAX_STOP;
  const minStopValue = params?.controlStops?.[0]?.stop ?? dataMin;
  const maxStopValue = params?.controlStops?.[params.controlStops.length - 1]?.stop ?? dataMax;
  return { min: minStopValue, max: maxStopValue };
}

export function getPaletteColors(
  palettes: PaletteRegistry,
  activePaletteParams: CustomPaletteParams,
  // used to customize color resolution
  { prevPalette, dataBounds }: { prevPalette?: string; dataBounds: { min: number; max: number } }
) {
  // compute the stopFactor based on steps value. Fallback to default if not defined yet
  // const steps = activePaletteParams.steps ?? DEFAULT_COLOR_STEPS;
  const { min: minStopValue, max: maxStopValue } = getCurrentMinMax(
    activePaletteParams,
    dataBounds
  );
  const interval = maxStopValue - minStopValue;
  const { stops, ...otherParams } = activePaletteParams || {};

  const params: Omit<CustomPaletteParams, 'stops'> & {
    stepped?: boolean;
    stops?: number[];
    colors?: string[];
  } = {
    ...otherParams,
    colors: activePaletteParams.controlStops?.map(({ color }) => color),
    stops: activePaletteParams.controlStops?.map(({ stop }) => stop),
    stepped: activePaletteParams?.progression !== 'gradient',
  };

  const colorStops = palettes
    .get(prevPalette || activePaletteParams?.name || defaultParams.name)
    .getCategoricalColors((activePaletteParams?.steps || defaultParams.steps) + 1, params);

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
  stops: ColorStop[],
  params: CustomPaletteParams,
  { dataBounds }: { dataBounds: { min: number; max: number } }
) {
  const newStops: ColorStop[] = [];
  const minStop = stops[0].stop;
  const minRef = params.rangeType === 'percent' ? 0 : dataBounds?.min || -Infinity;
  const maxRef = params.rangeType === 'percent' ? 100 : dataBounds?.max || Infinity;
  if (minStop !== minRef) {
    if (params.continuity === 'below' || params.continuity === 'all') {
      newStops.push({ color: stops[0].color, stop: minRef });
    }
  }
  newStops.push(...stops);

  const interval = maxRef - minRef;
  const newMin = (minStop / interval) * DEFAULT_MAX_STOP;

  return remapStopsByNewInterval(shiftPalette(newStops, maxRef), {
    newInterval: DEFAULT_MAX_STOP,
    newMin,
  });
}

export function isValidColor(colorString: string) {
  return colorString !== '' && isValidHex(colorString);
}
