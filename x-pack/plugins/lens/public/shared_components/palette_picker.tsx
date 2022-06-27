/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import { EuiColorPalettePicker, EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function PalettePicker({
  palettes,
  activePalette,
  setPalette,
}: {
  palettes: PaletteRegistry;
  activePalette?: PaletteOutput;
  setPalette: (palette: PaletteOutput) => void;
}) {
  const palettesToShow: EuiColorPalettePickerPaletteProps[] = palettes
    .getAll()
    .filter(({ internal }) => !internal)
    .map(({ id, title, getCategoricalColors }) => {
      return {
        value: id,
        title,
        type: 'fixed',
        palette: getCategoricalColors(
          10,
          id === activePalette?.name ? activePalette?.params : undefined
        ),
      };
    });
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
