/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { NewCustomizablePalette } from '../color_palette/palette_configuration';

import './palette_configuration.scss';

import type { CustomPaletteParams } from '../../../common';

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

export function CustomizablePalette({
  palettes,
  activePalette,
  setPalette,
  dataBounds,
  showContinuity = true,
  showRangeTypeSelector = true,
}: {
  palettes: PaletteRegistry;
  activePalette?: PaletteOutput<CustomPaletteParams>;
  setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
  dataBounds?: { min: number; max: number };
  showContinuity?: boolean;
  showRangeTypeSelector?: boolean;
}) {
  if (!dataBounds || !activePalette) {
    return null;
  }

  return (
    <>
      <NewCustomizablePalette
        palettes={palettes}
        activePalette={activePalette}
        setPalette={setPalette}
        dataBounds={dataBounds}
      />
    </>
  );
}
