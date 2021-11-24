/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PalettePicker } from './palette_picker';
import { CUSTOM_PALETTE } from './constants';
import { reverseTermsPalette, getSwitchToCustomParamsForTermsPalette } from './utils';
import { ColorTerms } from './color_terms';

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

export function CustomizableTermsPalette({
  palettes,
  activePalette,
  setPalette,
  terms,
}: {
  palettes: PaletteRegistry;
  activePalette?: PaletteOutput<CustomPaletteParams>;
  setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
  terms: string[];
}) {
  const selectedPalette = activePalette ?? {
    name: 'default',
    type: 'palette',
  };
  const colors = palettes.get(selectedPalette?.name).getCategoricalColors(terms.length);
  const colorTerms = terms.map((term, i) => ({
    color: colors[i],
    term,
  }));

  return (
    <>
      <div className="lnsPalettePanel__section lnsPalettePanel__section--shaded">
        <EuiFormRow
          display="rowCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.palettePicker.label', {
            defaultMessage: 'Color palette',
          })}
        >
          <PalettePicker
            data-test-subj="lnsPalettePanel_dynamicColoring_palette_picker"
            palettes={palettes}
            activePalette={selectedPalette}
            setPalette={(newPalette) => {
              const isNewPaletteCustom = newPalette.name === CUSTOM_PALETTE;
              const newParams: CustomPaletteParams = {
                ...selectedPalette?.params,
                name: newPalette.name,
                reverse: false, // restore the reverse flag
              };

              if (isNewPaletteCustom) {
                newParams.steps = colorTerms.length;
              } else {
                const newColors = palettes.get(newPalette?.name).getCategoricalColors(terms.length);
                const newColorTerms = terms.map((term, i) => ({
                  color: newColors[i],
                  term,
                }));

                newParams.colorTerms = newColorTerms;
              }

              setPalette({
                ...newPalette,
                params: newParams,
              });
            }}
            showCustomPalette
            // showDynamicColorOnly
          />
        </EuiFormRow>
        <EuiFormRow
          display="rowCompressed"
          label={i18n.translate('xpack.lens.table.dynamicColoring.customPalette.colorStopsLabel', {
            defaultMessage: 'Color stops',
          })}
          labelAppend={
            <EuiText size="xs">
              <EuiLink
                className="lnsPalettePanel__reverseButton"
                data-test-subj="lnsPalettePanel_dynamicColoring_reverse"
                onClick={() => {
                  // when reversing a palette, the palette is automatically transitioned to a custom palette
                  const newParams = getSwitchToCustomParamsForTermsPalette(
                    palettes,
                    selectedPalette,
                    {
                      colorTerms: reverseTermsPalette(colorTerms),
                      reverse: !selectedPalette?.params?.reverse, // Store the reverse state
                    }
                  );
                  setPalette(newParams);
                }}
              >
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon size="s" type="sortable" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {i18n.translate('xpack.lens.table.dynamicColoring.reverse.label', {
                      defaultMessage: 'Reverse colors',
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiLink>
            </EuiText>
          }
        >
          <ColorTerms
            paletteConfiguration={activePalette?.params}
            data-test-prefix="lnsPalettePanel"
            colorTerms={selectedPalette?.params?.colorTerms ?? colorTerms}
            onChange={(newColorTerms) => {
              const newParams = getSwitchToCustomParamsForTermsPalette(palettes, selectedPalette, {
                colorTerms: newColorTerms,
              });
              return setPalette(newParams);
            }}
          />
        </EuiFormRow>
      </div>
    </>
  );
}
