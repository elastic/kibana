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
  SPECIAL_RULE_MATCHES,
  getPaletteColors,
  EUIPalette,
  IKEAPalette,
  NeutralPalette,
  PastelPalette,
  TableauPalette,
} from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiColorPaletteDisplay, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getColorCategories } from '@kbn/expression-xy-plugin/public';
import { useState, MutableRefObject, useCallback } from 'react';
import { PalettePicker } from '@kbn/coloring/src/shared_components/coloring/palette_picker';
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
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  // TODO: move the available palette elsewhere
  const availablePalettes = new Map<string, ColorMapping.CategoricalPalette>([
    [EUIPalette.id, EUIPalette],
    [TableauPalette.id, TableauPalette],
    [IKEAPalette.id, IKEAPalette],
    [PastelPalette.id, PastelPalette],
    [NeutralPalette.id, NeutralPalette],
  ]);
  const colors = getPaletteColors(false, state.colorMapping);
  const table = frame.activeData?.[state.layerId];
  const splitCategories = getColorCategories(table?.rows ?? [], state.tagAccessor);

  const setColorMapping = useCallback(
    (updatedColorMap: ColorMapping.Config) => {
      setState({
        ...state,
        colorMapping: { ...updatedColorMap },
      });
    },
    [state, setState]
  );

  const canUseColorMapping = true;

  return canUseColorMapping ? (
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
        >
          <div className="lnsPalettePanel__section lnsPalettePanel__section--shaded lnsIndexPatternDimensionEditor--padded">
            <CategoricalColorMapping
              isDarkMode={isDarkMode}
              model={state.colorMapping ?? { ...DEFAULT_COLOR_MAPPING_CONFIG }}
              onModelUpdate={(model: ColorMapping.Config) => setColorMapping(model)}
              palettes={availablePalettes}
              data={{
                type: 'categories',
                categories: splitCategories,
                specialHandling: SPECIAL_RULE_MATCHES,
              }}
            />
          </div>
        </PalettePanelContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <PalettePicker
      palettes={paletteService}
      activePalette={state.palette}
      setPalette={(newPalette) => {
        setState({
          ...state,
          palette: newPalette,
        });
      }}
    />
  );
}
