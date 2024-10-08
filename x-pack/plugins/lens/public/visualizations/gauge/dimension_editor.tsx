/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSwitchEvent, EuiSwitch, EuiIcon } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { PaletteRegistry, CustomizablePalette, CUSTOM_PALETTE } from '@kbn/coloring';
import { GaugeTicksPositions, GaugeColorModes } from '@kbn/expression-gauge-plugin/common';
import { getMaxValue, getMinValue } from '@kbn/expression-gauge-plugin/public';
import { TooltipWrapper } from '@kbn/visualization-utils';
import { isNumericFieldForDatatable } from '../../../common/expressions/datatable/utils';
import { applyPaletteParams, PalettePanelContainer } from '../../shared_components';
import type { VisualizationDimensionEditorProps } from '../../types';
import type { GaugeVisualizationState } from './constants';
import { defaultPaletteParams } from './palette_config';
import { getAccessorsFromState } from './utils';

import './dimension_editor.scss';

export function GaugeDimensionEditor(
  props: VisualizationDimensionEditorProps<GaugeVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, frame, accessor, isInlineEditing } = props;

  if (state?.metricAccessor !== accessor) return null;

  const currentData = frame.activeData?.[state.layerId];
  const [firstRow] = currentData?.rows || [];

  if (accessor == null || firstRow == null || !isNumericFieldForDatatable(currentData, accessor)) {
    return null;
  }

  const accessors = getAccessorsFromState(state);

  const hasDynamicColoring = state?.colorMode === 'palette';

  const currentMinMax = {
    min: getMinValue(firstRow, accessors),
    max: getMaxValue(firstRow, accessors),
  };

  const activePalette = state?.palette || {
    type: 'palette',
    name: defaultPaletteParams.name,
    params: {
      ...defaultPaletteParams,
      continuity: 'all',
      colorStops: undefined,
      stops: undefined,
      rangeMin: currentMinMax.min,
      rangeMax: (currentMinMax.max * 3) / 4,
    },
  };

  const displayStops = applyPaletteParams(props.paletteService, activePalette, currentMinMax);

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
          data-test-subj="lnsDynamicColoringGaugeSwitch"
          compressed
          label=""
          showLabel={false}
          checked={hasDynamicColoring}
          onChange={(e: EuiSwitchEvent) => {
            const { checked } = e.target;
            const params = checked
              ? {
                  palette: {
                    ...activePalette,
                    params: {
                      ...activePalette.params,
                      stops: displayStops,
                    },
                  },
                  ticksPosition: GaugeTicksPositions.BANDS,
                  colorMode: GaugeColorModes.PALETTE,
                }
              : {
                  ticksPosition: GaugeTicksPositions.AUTO,
                  colorMode: GaugeColorModes.NONE,
                };

            setState({
              ...state,
              ...params,
            });
          }}
        />
      </EuiFormRow>
      {hasDynamicColoring && (
        <>
          <EuiFormRow
            className="lnsDynamicColoringRow"
            display="columnCompressed"
            fullWidth
            label={i18n.translate('xpack.lens.paletteMetricGradient.label', {
              defaultMessage: 'Color mapping',
            })}
          >
            <PalettePanelContainer
              palette={displayStops.map(({ color }) => color)}
              siblingRef={props.panelRef}
              isInlineEditing={isInlineEditing}
              title={i18n.translate('xpack.lens.paletteMetricGradient.label', {
                defaultMessage: 'Color mapping',
              })}
            >
              <CustomizablePalette
                palettes={props.paletteService}
                activePalette={activePalette}
                dataBounds={currentMinMax}
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
          </EuiFormRow>
          <EuiFormRow
            display="columnCompressedSwitch"
            fullWidth
            label={
              <TooltipWrapper
                position="top"
                tooltipContent={i18n.translate('xpack.lens.shared.ticksPositionOptionsTooltip', {
                  defaultMessage:
                    'Places ticks on each band border instead of distributing them evenly',
                })}
                condition={true}
                delay="regular"
              >
                <span>
                  {i18n.translate('xpack.lens.shared.ticksPositionOptions', {
                    defaultMessage: 'Ticks on bands',
                  })}

                  <EuiIcon
                    type="questionInCircle"
                    color="subdued"
                    size="s"
                    className="eui-alignTop"
                  />
                </span>
              </TooltipWrapper>
            }
          >
            <EuiSwitch
              compressed
              label={i18n.translate('xpack.lens.shared.ticksPositionOptions', {
                defaultMessage: 'Ticks on bands',
              })}
              data-test-subj="lens-toolbar-gauge-ticks-position-switch"
              showLabel={false}
              checked={state.ticksPosition === GaugeTicksPositions.BANDS}
              onChange={() => {
                setState({
                  ...state,
                  ticksPosition:
                    state.ticksPosition === GaugeTicksPositions.BANDS
                      ? GaugeTicksPositions.AUTO
                      : GaugeTicksPositions.BANDS,
                });
              }}
            />
          </EuiFormRow>
        </>
      )}
    </>
  );
}
