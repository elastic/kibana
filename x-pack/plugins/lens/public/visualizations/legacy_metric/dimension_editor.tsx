/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonGroup, EuiFormRow, htmlIdGenerator } from '@elastic/eui';
import { PaletteRegistry, CustomizablePalette, CUSTOM_PALETTE } from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ColorMode } from '@kbn/charts-plugin/common';
import type { LegacyMetricState } from '../../../common/types';
import { isNumericFieldForDatatable } from '../../../common/expressions/datatable/utils';
import { applyPaletteParams, PalettePanelContainer } from '../../shared_components';
import type { VisualizationDimensionEditorProps } from '../../types';
import { defaultPaletteParams } from './palette_config';

import './dimension_editor.scss';

const idPrefix = htmlIdGenerator()();

export function MetricDimensionEditor(
  props: VisualizationDimensionEditorProps<LegacyMetricState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, frame, accessor, isInlineEditing } = props;

  const currentData = frame.activeData?.[state.layerId];
  const [firstRow] = currentData?.rows || [];

  if (accessor == null || firstRow == null || !isNumericFieldForDatatable(currentData, accessor)) {
    return null;
  }
  const currentColorMode = state?.colorMode || ColorMode.None;
  const hasDynamicColoring = currentColorMode !== ColorMode.None;

  const currentMinMax = {
    min: Math.min(firstRow[accessor] * 2, firstRow[accessor] === 0 ? -50 : 0),
    // if value is 0, then fallback to 100 as last resort
    max: Math.max(firstRow[accessor] * 2, firstRow[accessor] === 0 ? 100 : 0),
  };

  const activePalette = state?.palette || {
    type: 'palette',
    name: defaultPaletteParams.name,
    params: {
      ...defaultPaletteParams,
      stops: undefined,
      colorStops: undefined,
      rangeMin: currentMinMax.min,
      rangeMax: (currentMinMax.max * 3) / 4,
    },
  };

  // need to tell the helper that the colorStops are required to display
  const displayStops = applyPaletteParams(props.paletteService, activePalette, currentMinMax);

  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.legacyMetric.dynamicColoring.label', {
          defaultMessage: 'Color by value',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.legacyMetric.dynamicColoring.label', {
            defaultMessage: 'Color by value',
          })}
          data-test-subj="lnsLegacyMetric_dynamicColoring_groups"
          name="dynamicColoring"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}None`,
              label: i18n.translate('xpack.lens.legacyMetric.dynamicColoring.none', {
                defaultMessage: 'None',
              }),
              'data-test-subj': 'lnsLegacyMetric_dynamicColoring_groups_none',
            },
            {
              id: `${idPrefix}Background`,
              label: i18n.translate('xpack.lens.legacyMetric.dynamicColoring.background', {
                defaultMessage: 'Fill',
              }),
              'data-test-subj': 'lnsLegacyMetric_dynamicColoring_groups_background',
            },
            {
              id: `${idPrefix}Labels`,
              label: i18n.translate('xpack.lens.legacyMetric.dynamicColoring.text', {
                defaultMessage: 'Text',
              }),
              'data-test-subj': 'lnsLegacyMetric_dynamicColoring_groups_labels',
            },
          ]}
          idSelected={`${idPrefix}${currentColorMode}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as ColorMode;
            const params: Partial<LegacyMetricState> = {
              colorMode: newMode,
            };
            if (!state?.palette && newMode !== ColorMode.None) {
              params.palette = {
                ...activePalette,
                params: {
                  ...activePalette.params,
                  // align this initial computation with same format for default
                  // palettes in the panel. This to avoid custom computation issue with metric
                  // fake data range
                  stops: displayStops.map((v, i, array) => ({
                    ...v,
                    stop: currentMinMax.min + (i === 0 ? 0 : array[i - 1].stop),
                  })),
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
          <PalettePanelContainer
            palette={displayStops.map(({ color }) => color)}
            siblingRef={props.panelRef}
            isInlineEditing={isInlineEditing}
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
              showRangeTypeSelector={false}
            />
          </PalettePanelContainer>
        </EuiFormRow>
      )}
    </>
  );
}
