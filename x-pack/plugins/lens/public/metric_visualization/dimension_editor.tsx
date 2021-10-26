/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiColorPaletteDisplay,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { ColorMode } from '../../../../../src/plugins/charts/common';
import type { PaletteRegistry } from '../../../../../src/plugins/charts/public';
import { isNumericFieldForDatatable, MetricState } from '../../common/expressions';
import {
  applyPaletteParams,
  CustomizablePalette,
  FIXED_PROGRESSION,
  getStopsForFixedMode,
  PalettePanelContainer,
} from '../shared_components';
import type { VisualizationDimensionEditorProps } from '../types';
import { defaultPaletteParams } from './palette_config';

import './dimension_editor.scss';

const idPrefix = htmlIdGenerator()();

export function MetricDimensionEditor(
  props: VisualizationDimensionEditorProps<MetricState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, frame, accessor } = props;
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const currentData = frame.activeData?.[state.layerId];
  const [firstRow] = currentData?.rows || [];

  if (accessor == null || firstRow == null || !isNumericFieldForDatatable(currentData, accessor)) {
    return null;
  }
  const currentColorMode = state?.colorMode || ColorMode.None;
  const hasDynamicColoring = currentColorMode !== ColorMode.None;

  const currentMinMax = {
    min: Math.min(0, firstRow[accessor] * 2),
    // if value is 0, then fallback to 100 as last resort
    max: Math.max(0, firstRow[accessor] * 2, firstRow[accessor] === 0 ? 100 : 0),
  };

  const activePalette = state?.palette || {
    type: 'palette',
    name: defaultPaletteParams.name,
    params: {
      ...defaultPaletteParams,
      stops: undefined,
      colorStops: undefined,
    },
  };
  // need to tell the helper that the colorStops are required to display
  const displayStops = applyPaletteParams(props.paletteService, activePalette, currentMinMax);

  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.metric.dynamicColoring.label', {
          defaultMessage: 'Color by value',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.metric.dynamicColoring.label', {
            defaultMessage: 'Color by value',
          })}
          data-test-subj="lnsMetric_dynamicColoring_groups"
          name="dynamicColoring"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}None`,
              label: i18n.translate('xpack.lens.metric.dynamicColoring.none', {
                defaultMessage: 'None',
              }),
              'data-test-subj': 'lnsMetric_dynamicColoring_groups_none',
            },
            {
              id: `${idPrefix}Background`,
              label: i18n.translate('xpack.lens.metric.dynamicColoring.background', {
                defaultMessage: 'Fill',
              }),
              'data-test-subj': 'lnsMetric_dynamicColoring_groups_background',
            },
            {
              id: `${idPrefix}Labels`,
              label: i18n.translate('xpack.lens.metric.dynamicColoring.text', {
                defaultMessage: 'Text',
              }),
              'data-test-subj': 'lnsMetric_dynamicColoring_groups_labels',
            },
          ]}
          idSelected={`${idPrefix}${currentColorMode}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as ColorMode;
            const params: Partial<MetricState> = {
              colorMode: newMode,
            };
            if (!state?.palette && newMode !== ColorMode.None) {
              params.palette = {
                ...activePalette,
                params: {
                  ...activePalette.params,
                  // just need the colors, the actual stop values will be ignored
                  stops: displayStops,
                },
              };
            }
            // clear up when switching to no coloring
            if (state?.palette && newMode === ColorMode.None) {
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
                data-test-subj="lnsMetric_dynamicColoring_palette"
                palette={getStopsForFixedMode(displayStops, activePalette.params?.colorStops)}
                type={FIXED_PROGRESSION}
                onClick={() => {
                  setIsPaletteOpen(!isPaletteOpen);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="lnsMetric_dynamicColoring_trigger"
                iconType="controlsHorizontal"
                onClick={() => {
                  setIsPaletteOpen(!isPaletteOpen);
                }}
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
                handleClose={() => setIsPaletteOpen(!isPaletteOpen)}
              >
                <CustomizablePalette
                  palettes={props.paletteService}
                  activePalette={activePalette}
                  dataBounds={currentMinMax}
                  setPalette={(newPalette) => {
                    setState({
                      ...state,
                      palette: newPalette,
                    });
                  }}
                  showContinuity={false}
                  showRangeTypeSelector={false}
                />
              </PalettePanelContainer>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      )}
    </>
  );
}
