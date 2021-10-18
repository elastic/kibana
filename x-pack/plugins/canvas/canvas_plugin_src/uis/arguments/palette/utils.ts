/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { getType } from '@kbn/interpreter/common';
import { ExpressionAstArgument, ExpressionAstFunction } from 'src/plugins/expressions';
import { identifyPalette, ColorPalette } from '../../../../common/lib';
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

  try {
    const colors = chain[0].arguments._.reduce<string[]>((args, arg) => {
      return reduceElementsWithType(args, arg, 'string', onError);
    }, []);

    const stops = chain[0].arguments.stops.reduce<number[]>((args, arg) => {
      return reduceElementsWithType(args, arg, 'number', onError);
    }, []);

    const gradient = !!get(chain[0].arguments.gradient, '[0]');
    const palette = identifyPalette({ colors, gradient });

    if (palette) {
      return {
        ...palette,
        stops,
      };
    }

    return createCustomPalette({ colors, gradient, stops });
  } catch (e) {
    onError();
  }
  return null;
};
