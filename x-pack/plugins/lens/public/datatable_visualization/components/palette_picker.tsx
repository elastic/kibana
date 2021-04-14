/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiColorPalettePicker, EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { CustomPaletteParams } from '../expression';

function getType(
  id: string,
  activePalette: PaletteOutput<CustomPaletteParams> | undefined
): 'gradient' | 'fixed' {
  if (id === activePalette?.name) {
    if (
      activePalette.params &&
      activePalette.params.progression &&
      activePalette.params.progression !== 'stepped'
    ) {
      return activePalette.params.progression;
    }
  }
  return 'fixed';
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
  return 10;
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
    const { id, title } = palettes.get('custom');
    palettesToShow.push({ value: id, title, type: 'text' });
  }
  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={i18n.translate('xpack.lens.palettePicker.label', {
        defaultMessage: 'Color palette',
      })}
    >
      <>
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
          valueOfSelected={activePalette?.name || 'default'}
          selectionDisplay={'palette'}
        />
      </>
    </EuiFormRow>
  );
}
