/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getType } from '@kbn/interpreter';
import { ExpressionAstArgument, ExpressionAstFunction } from 'src/plugins/expressions';
import { identifyPalette, ColorPalette, identifyPartialPalette } from '../../../../common/lib';
import { ArgumentStrings } from '../../../../i18n';

const { Palette: strings } = ArgumentStrings;

export const CUSTOM_PALETTE = 'custom';

interface PaletteParams {
  colors: string[];
  gradient: boolean;
  stops?: number[];
}

export const createCustomPalette = (
  paletteParams: PaletteParams
): ColorPalette<typeof CUSTOM_PALETTE> => ({
  id: CUSTOM_PALETTE,
  label: strings.getCustomPaletteLabel(),
  ...paletteParams,
});

type UnboxArray<T> = T extends Array<infer U> ? U : T;

function reduceElementsWithType<T extends unknown[]>(
  arr: any[],
  arg: ExpressionAstArgument,
  type: string,
  onError: () => void
) {
  if (getType(arg) !== type) {
    onError();
  }
  return [...arr, arg as UnboxArray<T>];
}

// TODO: This is weird, its basically a reimplementation of what the interpretter would return.
// Probably a better way todo this, and maybe a better way to handle template type objects in general?
export const astToPalette = (
  { chain }: { chain: ExpressionAstFunction[] },
  onError: () => void
): ColorPalette | ColorPalette<typeof CUSTOM_PALETTE> | null => {
  if (chain.length !== 1 || chain[0].function !== 'palette') {
    onError();
    return null;
  }

  const { _, stop: argStops, gradient: argGradient, ...restArgs } = chain[0].arguments ?? {};

  try {
    const colors =
      _?.reduce<string[]>((args, arg) => {
        return reduceElementsWithType(args, arg, 'string', onError);
      }, []) ?? [];

    const stops =
      argStops?.reduce<number[]>((args, arg) => {
        return reduceElementsWithType(args, arg, 'number', onError);
      }, []) ?? [];

    const gradient = !!argGradient?.[0];
    const palette = (stops.length ? identifyPartialPalette : identifyPalette)({ colors, gradient });
    const restPreparedArgs = Object.keys(restArgs).reduce<
      Record<string, ExpressionAstArgument | ExpressionAstArgument[]>
    >((acc, argName) => {
      acc[argName] = restArgs[argName]?.length > 1 ? restArgs[argName] : restArgs[argName]?.[0];
      return acc;
    }, {});

    if (palette) {
      return {
        ...palette,
        ...restPreparedArgs,
        stops,
      };
    }

    return createCustomPalette({ colors, gradient, stops, ...restPreparedArgs });
  } catch (e) {
    onError();
  }
  return null;
};
