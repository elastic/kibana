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
import {
  reverseTermsPalette,
  getSwitchToCustomParamsForTermsPalette,
  getTermsPaletteColors,
} from './utils';
import { ColorTerms } from './color_terms';

import type { CustomPaletteParams } from '../../../common';

export function CustomizableTermsPalette({
  libraryPalettes,
  palettes,
  activePalette,
  setPalette,
  savePaletteToLibrary,
  terms,
}: {
  libraryPalettes?: Array<PaletteOutput<CustomPaletteParams>>;
  palettes: PaletteRegistry;
  activePalette?: PaletteOutput<CustomPaletteParams>;
  setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
  savePaletteToLibrary: (palette: PaletteOutput<CustomPaletteParams>, title: string) => void;
  terms: string[];
}) {
  let selectedPalette = activePalette ?? {
    name: 'default',
    type: 'palette',
  };
  const colors = getTermsPaletteColors(selectedPalette, palettes, terms);
  const colorTerms = terms.map((term, i) => ({
    color: colors[i],
    term,
  }));

  selectedPalette = {
    ...selectedPalette,
    params: {
      ...selectedPalette.params,
      colorTerms,
    },
  };

  const savePalette = (title: string) => {
    savePaletteToLibrary(selectedPalette, title);
  };

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
            libraryPalettes={libraryPalettes}
            activePalette={selectedPalette}
            setPalette={(newPalette) => {
              const isNewPaletteCustom = newPalette.name === CUSTOM_PALETTE;
              const isSavedToLibrary = newPalette.isSavedToLibrary ?? false;
              const newParams: CustomPaletteParams = {
                ...selectedPalette?.params,
                name: newPalette.name,
              };

              if (isNewPaletteCustom) {
                newParams.steps = colorTerms.length;
              } else if (isSavedToLibrary) {
                const savedPalette = libraryPalettes?.find(
                  (p) => p.params?.title === newPalette.name
                );
                newParams.colorTerms = savedPalette?.params?.colorTerms;
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
                name: isSavedToLibrary ? CUSTOM_PALETTE : newPalette.name,
                params: newParams,
              });
            }}
            showCustomPalette
          />
        </EuiFormRow>
        <EuiFormRow
          display="rowCompressed"
          label={i18n.translate('xpack.lens.table.dynamicColoring.customPalette.colorTermsLabel', {
            defaultMessage: 'Color terms',
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
                      colorTerms: reverseTermsPalette(selectedPalette?.params?.colorTerms),
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
            paletteConfiguration={selectedPalette?.params}
            data-test-prefix="lnsPalettePanel"
            colorTerms={selectedPalette?.params?.colorTerms ?? colorTerms}
            savePalette={savePalette}
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
