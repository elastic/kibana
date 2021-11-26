/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiColorPaletteDisplay,
  EuiFormRow,
  EuiFlexItem,
  EuiSwitchEvent,
  EuiSwitch,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import { isNumericFieldForDatatable, GaugeVisualizationState } from '../../../common/expressions';
import {
  applyPaletteParams,
  CustomizablePalette,
  CUSTOM_PALETTE,
  FIXED_PROGRESSION,
  getStopsForFixedMode,
  PalettePanelContainer,
} from '../../shared_components/';
import type { VisualizationDimensionEditorProps } from '../../types';
import { defaultPaletteParams } from './palette_config';

import './dimension_editor.scss';
import { getMaxValue, getMinValue } from './utils';

export function GaugeDimensionEditor(
  props: VisualizationDimensionEditorProps<GaugeVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, frame, accessor } = props;
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  if (state?.metricAccessor !== accessor) return null;

  const currentData = frame.activeData?.[state.layerId];
  const [firstRow] = currentData?.rows || [];

  if (accessor == null || firstRow == null || !isNumericFieldForDatatable(currentData, accessor)) {
    return null;
  }

  const hasDynamicColoring = state?.colorMode === 'palette';

  const currentMinMax = {
    min: getMinValue(firstRow, state),
    max: getMaxValue(firstRow, state),
  };

  const activePalette = state?.palette || {
    type: 'palette',
    name: defaultPaletteParams.name,
    params: {
      ...defaultPaletteParams,
      colorStops: undefined,
      stops: undefined,
      rangeMin: currentMinMax.min,
      rangeMax: (currentMinMax.max * 3) / 4,
    },
  };

  const displayStops = applyPaletteParams(props.paletteService, activePalette, currentMinMax);

  const togglePalette = () => setIsPaletteOpen(!isPaletteOpen);
  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.gauge.dynamicColoring.label', {
          defaultMessage: 'Band colors',
        })}
        className="lnsDynamicColoringRow"
      >
        <EuiSwitch
          compressed
          label=""
          showLabel={false}
          checked={hasDynamicColoring}
          onChange={(e: EuiSwitchEvent) => {
            const { checked } = e.target;
            const params: Partial<GaugeVisualizationState> = {
              colorMode: checked ? 'palette' : 'none',
            };
            if (checked) {
              params.palette = {
                ...activePalette,
                params: {
                  ...activePalette.params,
                  stops: displayStops,
                },
              };
            }
            if (!checked) {
              if (state.ticksPosition === 'bands') {
                params.ticksPosition = 'auto';
              }
              params.palette = undefined;
            }
            setState({
              ...state,
              ...params,
            });
          }}
        />
      </EuiFormRow>
      {hasDynamicColoring && (
        <EuiFormRow
          className="lnsDynamicColoringRow"
          display="columnCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.paletteMetricGradient.label', {
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
                data-test-subj="lnsGauge_dynamicColoring_palette"
                palette={
                  activePalette.params?.name === CUSTOM_PALETTE
                    ? getStopsForFixedMode(
                        activePalette.params.stops!,
                        activePalette.params.colorStops
                      )
                    : displayStops.map(({ color }) => color)
                }
                type={FIXED_PROGRESSION}
                onClick={togglePalette}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="lnsGauge_dynamicColoring_trigger"
                iconType="controlsHorizontal"
                onClick={togglePalette}
                size="xs"
                flush="both"
              >
                {i18n.translate('xpack.lens.paletteTableGradient.customize', {
                  defaultMessage: 'Edit',
                })}
              </EuiButtonEmpty>
              <PalettePanelContainer
                siblingRef={props.panelRef}
                isOpen={isPaletteOpen}
                handleClose={togglePalette}
              >
                <CustomizablePalette
                  palettes={props.paletteService}
                  activePalette={activePalette}
                  dataBounds={currentMinMax}
                  showContinuity={false}
                  setPalette={(newPalette) => {
                    // if the new palette is not custom, replace the rangeMin with the artificial one
                    if (
                      newPalette.name !== CUSTOM_PALETTE &&
                      newPalette.params &&
                      newPalette.params.rangeMin !== currentMinMax.min
                    ) {
                      newPalette.params.rangeMin = currentMinMax.min;
                    }
                    setState({
                      ...state,
                      palette: newPalette,
                    });
                  }}
                />
              </PalettePanelContainer>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      )}
    </>
  );
}
