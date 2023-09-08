/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  PaletteRegistry,
  CategoricalColorMapping,
  DEFAULT_COLOR_MAPPING_CONFIG,
  ColorMapping,
  getPaletteColors,
  SPECIAL_TOKENS_STRING_CONVERTION,
  PaletteOutput,
  AVAILABLE_PALETTES,
} from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiColorPaletteDisplay,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
} from '@elastic/eui';
import { getColorCategories } from '@kbn/expression-xy-plugin/public';
import { useState, MutableRefObject, useCallback } from 'react';
import { PalettePicker } from '@kbn/coloring/src/shared_components/coloring/palette_picker';
import { useDebouncedValue } from '@kbn/visualization-ui-components';
import type { TagcloudState } from './types';
import { PalettePanelContainer } from '../../shared_components';
import { FramePublicAPI } from '../../types';

interface Props {
  paletteService: PaletteRegistry;
  state: TagcloudState;
  setState: (state: TagcloudState) => void;
  frame: FramePublicAPI;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  isDarkMode: boolean;
}

export function TagsDimensionEditor({
  state,
  frame,
  setState,
  panelRef,
  isDarkMode,
  paletteService,
}: Props) {
  const { inputValue: localState, handleInputChange: setLocalState } =
    useDebouncedValue<TagcloudState>({
      value: state,
      onChange: setState,
    });
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [useNewColorMapping, setUseNewColorMapping] = useState(state.colorMapping ? true : false);

  const colors = getPaletteColors(false, state.colorMapping);
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
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      className="lnsDynamicColoringClickable"
    >
      <EuiFlexItem>
        <EuiColorPaletteDisplay
          data-test-subj="lnsXY_dynamicColoring_palette"
          palette={colors}
          type={'fixed'}
          onClick={() => {
            setIsPaletteOpen(!isPaletteOpen);
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj="lnsXY_dynamicColoring_trigger"
          aria-label={i18n.translate('xpack.lens.paletteXYGradient.customizeLong', {
            defaultMessage: 'Edit palette',
          })}
          iconType="controlsHorizontal"
          onClick={() => {
            setIsPaletteOpen(!isPaletteOpen);
          }}
          size="xs"
          flush="both"
        >
          {i18n.translate('xpack.lens.paletteXYGradient.customize', {
            defaultMessage: 'Edit',
          })}
        </EuiButtonEmpty>
        <PalettePanelContainer
          siblingRef={panelRef}
          isOpen={isPaletteOpen}
          handleClose={() => setIsPaletteOpen(!isPaletteOpen)}
          title={i18n.translate('xpack.lens.table.colorByTermsPanelTitle', {
            defaultMessage: 'Color assignments',
          })}
        >
          <div className="lnsPalettePanel__section lnsPalettePanel__section--shaded lnsIndexPatternDimensionEditor--padded">
            <EuiFlexGroup direction="column" gutterSize="s" justifyContent="flexStart">
              <EuiFlexItem>
                <EuiSwitch
                  label="Use new color mapping (tech preview)"
                  compressed
                  checked={useNewColorMapping}
                  onChange={(e) => {
                    setColorMapping(
                      e.target.checked ? { ...DEFAULT_COLOR_MAPPING_CONFIG } : undefined
                    );
                    setUseNewColorMapping(e.target.checked);
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
                      specialTokens: SPECIAL_TOKENS_STRING_CONVERTION,
                    }}
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
