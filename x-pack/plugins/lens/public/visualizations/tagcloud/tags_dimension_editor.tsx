/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSwitch, EuiText } from '@elastic/eui';
import { getColorCategories } from '@kbn/chart-expressions-common';
import {
  AVAILABLE_PALETTES,
  CategoricalColorMapping,
  ColorMapping,
  DEFAULT_COLOR_MAPPING_CONFIG,
  PaletteOutput,
  PaletteRegistry,
  SPECIAL_TOKENS_STRING_CONVERTION,
  getColorsFromMapping,
} from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/visualization-ui-components';
import React from 'react';
import { MutableRefObject, useCallback, useState } from 'react';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';
import { PalettePanelContainer, PalettePicker } from '../../shared_components';
import { FramePublicAPI } from '../../types';
import type { TagcloudState } from './types';

interface Props {
  paletteService: PaletteRegistry;
  state: TagcloudState;
  setState: (state: TagcloudState) => void;
  frame: FramePublicAPI;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  isDarkMode: boolean;
  isInlineEditing?: boolean;
}

export function TagsDimensionEditor({
  state,
  frame,
  setState,
  panelRef,
  isDarkMode,
  paletteService,
  isInlineEditing,
}: Props) {
  const { inputValue: localState, handleInputChange: setLocalState } =
    useDebouncedValue<TagcloudState>({
      value: state,
      onChange: setState,
    });
  const [useNewColorMapping, setUseNewColorMapping] = useState(state.colorMapping ? true : false);

  const colors = getColorsFromMapping(isDarkMode, state.colorMapping);
  const table = frame.activeData?.[state.layerId];
  const splitCategories = getColorCategories(table?.rows ?? [], state.tagAccessor);

  const setColorMapping = useCallback(
    (colorMapping?: ColorMapping.Config) => {
      setLocalState({
        ...localState,
        colorMapping,
      });
    },
    [localState, setLocalState]
  );

  const setPalette = useCallback(
    (palette: PaletteOutput) => {
      setLocalState({
        ...localState,
        palette,
        colorMapping: undefined,
      });
    },
    [localState, setLocalState]
  );

  const canUseColorMapping = state.colorMapping;

  return (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.translate('xpack.lens.colorMapping.editColorMappingSectionlabel', {
        defaultMessage: 'Color mapping',
      })}
      style={{ alignItems: 'center' }}
      fullWidth
    >
      <PalettePanelContainer
        palette={colors}
        siblingRef={panelRef}
        title={
          useNewColorMapping
            ? i18n.translate('xpack.lens.colorMapping.editColorMappingTitle', {
                defaultMessage: 'Edit colors by term mapping',
              })
            : i18n.translate('xpack.lens.colorMapping.editColorsTitle', {
                defaultMessage: 'Edit colors',
              })
        }
        isInlineEditing={isInlineEditing}
      >
        <div className="lnsPalettePanel__section lnsPalettePanel__section--shaded lnsIndexPatternDimensionEditor--padded">
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
            </EuiFlexItem>
            <EuiFlexItem>
              {canUseColorMapping || useNewColorMapping ? (
                <CategoricalColorMapping
                  isDarkMode={isDarkMode}
                  model={state.colorMapping ?? { ...DEFAULT_COLOR_MAPPING_CONFIG }}
                  onModelUpdate={(model: ColorMapping.Config) => setColorMapping(model)}
                  palettes={AVAILABLE_PALETTES}
                  data={{
                    type: 'categories',
                    categories: splitCategories,
                  }}
                  specialTokens={SPECIAL_TOKENS_STRING_CONVERTION}
                />
              ) : (
                <PalettePicker
                  palettes={paletteService}
                  activePalette={state.palette}
                  setPalette={(newPalette) => {
                    setPalette(newPalette);
                  }}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </PalettePanelContainer>
    </EuiFormRow>
  );
}
