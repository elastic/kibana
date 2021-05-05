/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiColorPalettePicker, EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { CustomPaletteParams } from '../expression';
import { reversePalette } from './coloring/utils';
import {
  CUSTOM_PALETTE,
  defaultParams,
  DEFAULT_COLOR_STEPS,
  DEFAULT_CUSTOM_STEPS,
  FIXED_PROGRESSION,
  STEPPED_PROGRESSION,
} from './coloring/constants';

function getType(
  id: string,
  activePalette: PaletteOutput<CustomPaletteParams> | undefined
): 'gradient' | 'fixed' {
  if (id === activePalette?.name) {
    if (activePalette?.params?.progression === 'gradient') {
      return activePalette.params.progression;
    }
  }
  return FIXED_PROGRESSION;
}

function getPaletteSteps(
  id: string,
  activePalette: PaletteOutput<CustomPaletteParams> | undefined
): number {
  if (id === activePalette?.name) {
    if (activePalette.params?.steps) {
      return activePalette.params.steps;
    }
  }
  return DEFAULT_COLOR_STEPS;
}

function getCustomPaletteConfig(
  palettes: PaletteRegistry,
  activePalette: PaletteOutput<CustomPaletteParams> | undefined
) {
  const { id, title } = palettes.get(CUSTOM_PALETTE);
  const displayType: 'gradient' | 'fixed' =
    activePalette?.params?.progression === STEPPED_PROGRESSION
      ? FIXED_PROGRESSION
      : activePalette?.params?.progression || FIXED_PROGRESSION;

  // Try to generate a palette from the current one
  if (activePalette && activePalette.name !== CUSTOM_PALETTE) {
    const currentPalette = palettes.get(activePalette.name);
    if (currentPalette) {
      const stops = currentPalette.getCategoricalColors(
        DEFAULT_CUSTOM_STEPS - 1,
        activePalette?.params
      );
      const palette = activePalette.params?.reverse ? stops.reverse() : stops;
      return {
        value: id,
        title,
        type: displayType,
        palette,
      };
    }
  }
  // if not possible just show some text
  if (!activePalette?.params?.stops) {
    return { value: id, title, type: 'text' as const };
  }

  const stops = activePalette.params.stops;

  // full custom palette
  return {
    value: id,
    title,
    type: displayType,
    palette: activePalette.params.reverse ? reversePalette(stops) : stops,
  };
}

export function PalettePicker({
  palettes,
  activePalette,
  setPalette,
  showCustomPalette,
  showDynamicColorOnly,
}: {
  palettes: PaletteRegistry;
  activePalette?: PaletteOutput<CustomPaletteParams>;
  setPalette: (palette: PaletteOutput) => void;
  showCustomPalette?: boolean;
  showDynamicColorOnly?: boolean;
}) {
  const palettesToShow: EuiColorPalettePickerPaletteProps[] = palettes
    .getAll()
    .filter(({ internal, canDynamicColoring }) =>
      showDynamicColorOnly ? canDynamicColoring : !internal
    )
    .map(({ id, title, getCategoricalColors }) => {
      const colors = getCategoricalColors(
        getPaletteSteps(id, activePalette),
        id === activePalette?.name ? activePalette?.params : undefined
      );
      return {
        value: id,
        title,
        type: getType(id, activePalette),
        palette: activePalette?.params?.reverse ? colors.reverse() : colors,
      };
    });
  if (showCustomPalette) {
    palettesToShow.push(getCustomPaletteConfig(palettes, activePalette));
  }
  return (
    <EuiColorPalettePicker
      data-test-subj="lns-palettePicker"
      compressed
      palettes={palettesToShow}
      onChange={(newPalette) => {
        setPalette({
          type: 'palette',
          name: newPalette,
        });
      }}
      valueOfSelected={activePalette?.name || defaultParams.name}
      selectionDisplay={'palette'}
    />
  );
}
