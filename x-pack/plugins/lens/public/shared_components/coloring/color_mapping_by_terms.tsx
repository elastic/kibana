/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MutableRefObject, useState } from 'react';

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import {
  ColorMapping,
  DEFAULT_COLOR_MAPPING_CONFIG,
  CategoricalColorMapping,
  SPECIAL_TOKENS_STRING_CONVERSION,
  AVAILABLE_PALETTES,
  PaletteOutput,
  PaletteRegistry,
  CustomPaletteParams,
} from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';
import { PalettePicker } from '../palette_picker';
import { PalettePanelContainer } from './palette_panel_container';
import { getColorStops } from './utils';

interface ColorMappingByTermsProps {
  isDarkMode: boolean;
  colorMapping?: ColorMapping.Config;
  palette?: PaletteOutput<CustomPaletteParams>;
  isInlineEditing?: boolean;
  setPalette: (palette: PaletteOutput) => void;
  setColorMapping: (colorMapping?: ColorMapping.Config) => void;
  paletteService: PaletteRegistry;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  categories: Array<string | string[]>;
}

export function ColorMappingByTerms({
  isDarkMode,
  colorMapping,
  palette,
  isInlineEditing,
  setPalette,
  setColorMapping,
  paletteService,
  panelRef,
  categories,
}: ColorMappingByTermsProps) {
  const [useNewColorMapping, setUseNewColorMapping] = useState(Boolean(colorMapping));

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
        palette={getColorStops(paletteService, isDarkMode, palette, colorMapping)}
        siblingRef={panelRef}
        title={
          useNewColorMapping
            ? i18n.translate('xpack.lens.colorMapping.editColorMappingTitle', {
                defaultMessage: 'Assign colors to terms',
              })
            : i18n.translate('xpack.lens.colorMapping.editColorsTitle', {
                defaultMessage: 'Edit colors',
              })
        }
        isInlineEditing={isInlineEditing}
      >
        <div
          data-test-subj="lns-palettePanel-terms"
          className="lnsPalettePanel__section lnsPalettePanel__section--shaded lnsIndexPatternDimensionEditor--padded"
        >
          <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart">
            <EuiFlexItem>
              <EuiSwitch
                label={
                  <EuiText size="xs">
                    <span>
                      {i18n.translate('xpack.lens.colorMapping.tryLabel', {
                        defaultMessage: 'Use the new Color Mapping feature',
                      })}{' '}
                      <EuiBadge color="hollow">
                        {i18n.translate('xpack.lens.colorMapping.techPreviewLabel', {
                          defaultMessage: 'Tech preview',
                        })}
                      </EuiBadge>
                    </span>
                  </EuiText>
                }
                data-test-subj="lns_colorMappingOrLegacyPalette_switch"
                compressed
                checked={useNewColorMapping}
                onChange={({ target: { checked } }) => {
                  trackUiCounterEvents(`color_mapping_switch_${checked ? 'enabled' : 'disabled'}`);
                  setColorMapping(checked ? { ...DEFAULT_COLOR_MAPPING_CONFIG } : undefined);
                  setUseNewColorMapping(checked);
                }}
              />
              <EuiSpacer size="s" />
            </EuiFlexItem>
            <EuiFlexItem>
              {useNewColorMapping ? (
                <CategoricalColorMapping
                  isDarkMode={isDarkMode}
                  model={colorMapping ?? { ...DEFAULT_COLOR_MAPPING_CONFIG }}
                  onModelUpdate={setColorMapping}
                  specialTokens={SPECIAL_TOKENS_STRING_CONVERSION}
                  palettes={AVAILABLE_PALETTES}
                  data={{
                    type: 'categories',
                    categories,
                  }}
                />
              ) : (
                <PalettePicker
                  palettes={paletteService}
                  activePalette={palette}
                  setPalette={setPalette}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </PalettePanelContainer>
    </EuiFormRow>
  );
}
