/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiColorPaletteDisplay,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
} from '@elastic/eui';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { VisualizationDimensionEditorProps } from '../types';
import {
  CustomizablePalette,
  FIXED_PROGRESSION,
  PalettePanelContainer,
  DimensionEditorSection,
} from '../shared_components/';
import './dimension_editor.scss';
import type { HeatmapVisualizationState } from './types';
import { getSafePaletteParams } from './utils';

export function HeatmapDimensionEditor(
  props: VisualizationDimensionEditorProps<HeatmapVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, frame, accessor } = props;
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  if (state?.valueAccessor !== accessor) return null;

  const currentData = frame.activeData?.[state.layerId];

  // need to tell the helper that the colorStops are required to display
  const { displayStops, activePalette, currentMinMax } = getSafePaletteParams(
    props.paletteService,
    currentData,
    accessor,
    state?.palette && state.palette.accessor === accessor ? state.palette : undefined
  );

  return (
    <DimensionEditorSection>
      <EuiFormRow
        className="lnsDynamicColoringRow"
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.paletteHeatmapGradient.label', {
          defaultMessage: 'Color',
        })}
      >
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          className="lnsDynamicColoringClickable"
        >
          <EuiFlexItem>
            <EuiColorPaletteDisplay
              data-test-subj="lnsHeatmap_dynamicColoring_palette"
              palette={displayStops.map(({ color }) => color)}
              type={FIXED_PROGRESSION}
              onClick={() => {
                setIsPaletteOpen(!isPaletteOpen);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="lnsHeatmap_dynamicColoring_trigger"
              aria-label={i18n.translate('xpack.lens.paletteHeatmapGradient.customizeLong', {
                defaultMessage: 'Edit palette',
              })}
              iconType="controlsHorizontal"
              onClick={() => {
                setIsPaletteOpen(!isPaletteOpen);
              }}
              size="xs"
              flush="both"
            >
              {i18n.translate('xpack.lens.paletteHeatmapGradient.customize', {
                defaultMessage: 'Edit',
              })}
            </EuiButtonEmpty>
            <PalettePanelContainer
              siblingRef={props.panelRef}
              isOpen={isPaletteOpen}
              handleClose={() => setIsPaletteOpen(!isPaletteOpen)}
            >
              {activePalette && (
                <CustomizablePalette
                  palettes={props.paletteService}
                  activePalette={activePalette}
                  dataBounds={currentMinMax}
                  setPalette={(newPalette) => {
                    // make sure to always have a list of stops
                    if (newPalette.params && !newPalette.params.stops) {
                      newPalette.params.stops = displayStops;
                    }
                    (newPalette as HeatmapVisualizationState['palette'])!.accessor = accessor;
                    setState({
                      ...state,
                      palette: newPalette as HeatmapVisualizationState['palette'],
                    });
                  }}
                />
              )}
            </PalettePanelContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </DimensionEditorSection>
  );
}
