/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MutableRefObject } from 'react';

import { EuiFormRow } from '@elastic/eui';
import {
  PaletteOutput,
  PaletteRegistry,
  CustomizablePalette,
  DataBounds,
  CustomPaletteParams,
} from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import { PalettePanelContainer } from './palette_panel_container';

interface ColorMappingByValuesProps {
  palette: PaletteOutput<CustomPaletteParams>;
  isInlineEditing?: boolean;
  setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
  paletteService: PaletteRegistry;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  dataBounds?: DataBounds;
}

export function ColorMappingByValues<T>({
  palette,
  isInlineEditing,
  setPalette,
  paletteService,
  panelRef,
  dataBounds,
}: ColorMappingByValuesProps) {
  const colors = palette.params?.stops?.map(({ color }) => color) ?? [];

  return (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.translate('xpack.lens.colorMapping.editColorMappingSectionLabel', {
        defaultMessage: 'Color mapping',
      })}
      style={{ alignItems: 'center' }}
      fullWidth
    >
      <PalettePanelContainer
        palette={colors}
        siblingRef={panelRef}
        title={i18n.translate('xpack.lens.colorMapping.editColorsTitle', {
          defaultMessage: 'Edit colors',
        })}
        isInlineEditing={isInlineEditing}
      >
        <div
          data-test-subj="lns-palettePanel-values"
          className="lnsPalettePanel__section lnsPalettePanel__section--shaded lnsIndexPatternDimensionEditor--padded"
        >
          <CustomizablePalette
            palettes={paletteService}
            dataBounds={dataBounds}
            activePalette={palette}
            setPalette={(p) => {
              setPalette(p);
            }}
          />
        </div>
      </PalettePanelContainer>
    </EuiFormRow>
  );
}
