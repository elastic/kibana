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
import { CustomizablePalette, FIXED_PROGRESSION, PaletteRegistry } from '@kbn/coloring';
import { i18n } from '@kbn/i18n';
import {
  PalettePicker,
  applyPaletteParams,
  findMinMaxByColumnId,
  PalettePanelContainer,
} from '@kbn/lens-plugin/public';
import { VisualizationDimensionEditorProps } from '@kbn/lens-plugin/public/types';
import React, { useState } from 'react';
import { DecorationState } from './expression_decoration_fn';
import { GraphState } from './types';

const idPrefix = htmlIdGenerator('graphLens')();

type ColumnType = GraphState['metricConfig'][number];

export function DimensionEditor(
  props: VisualizationDimensionEditorProps<GraphState> & { paletteService: PaletteRegistry }
) {
  if (props.groupId === 'entities') {
    return <BucketedDimensionEditor {...props} />;
  }
  return <MetricDimensionEditor {...props} />;
}

function BucketedDimensionEditor(
  props: VisualizationDimensionEditorProps<GraphState> & { paletteService: PaletteRegistry }
) {
  return (
    <PalettePicker
      palettes={props.paletteService}
      activePalette={props.state.palette}
      setPalette={(newPalette) => {
        props.setState({ ...props.state, palette: newPalette });
      }}
    />
  );
}

function MetricDimensionEditor(
  props: VisualizationDimensionEditorProps<GraphState> & { paletteService: PaletteRegistry }
) {
  const { state, accessor, setState, frame } = props;
  const currentConfig = state.metricConfig?.find(({ metricId }) => metricId === accessor);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  if (!currentConfig) return null;
  const currentMapValuesMode = currentConfig.mapValuesTo || 'size';
  const hasDynamicColoring = currentMapValuesMode === 'color';

  const currentData = frame.activeData?.[state.layerId];
  const activePalette = currentConfig?.palette || {
    type: 'palette',
    name: 'warm',
  };

  const minMaxByColumnId = findMinMaxByColumnId([accessor], currentData);
  const currentMinMax = minMaxByColumnId[accessor];
  // need to tell the helper that the colorStops are required to display
  const displayStops = applyPaletteParams(props.paletteService, activePalette, currentMinMax);

  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.graph.dynamicMapping.label', {
          defaultMessage: 'Map values to',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.graph.dynamicMapping.label', {
            defaultMessage: 'Map values to',
          })}
          data-test-subj="lnsDatatable_dynamicMappings_groups"
          name="dynamicMapping"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}size`,
              label: i18n.translate('xpack.lens.table.dynamicMapping.size', {
                defaultMessage: 'Size',
              }),
              'data-test-subj': 'lnsGraph_dynamicMapping_groups_size',
            },
            {
              id: `${idPrefix}color`,
              label: i18n.translate('xpack.lens.table.dynamicMapping.color', {
                defaultMessage: 'Color',
              }),
              'data-test-subj': 'lnsGraph_dynamicMapping_groups_color',
            },
          ]}
          idSelected={`${idPrefix}${currentMapValuesMode}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as ColumnType['mapValuesTo'];
            const params: Partial<ColumnType> = {
              mapValuesTo: newMode,
            };
            if (!currentConfig.palette && newMode !== 'size') {
              params.palette = {
                ...activePalette,
                params: {
                  ...activePalette.params,
                  // that's ok, at first open we're going to throw them away and recompute
                  stops: displayStops,
                },
              };
            }
            // clear up when switching to no coloring
            if (currentConfig?.palette && newMode === 'size') {
              params.palette = undefined;
            }
            setState({
              ...state,
              metricConfig: updateMetricConfig(state.metricConfig, accessor, params),
            });
          }}
        />
      </EuiFormRow>
      {hasDynamicColoring && (
        <EuiFormRow
          className="lnsDynamicColoringRow"
          display="columnCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.paletteTableGradient.label', {
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
                data-test-subj="lnsDatatable_dynamicColoring_palette"
                palette={displayStops.map(({ color }) => color)}
                type={FIXED_PROGRESSION}
                onClick={() => {
                  setIsPaletteOpen(!isPaletteOpen);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="lnsDatatable_dynamicColoring_trigger"
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
                      metricConfig: updateMetricConfig(state.metricConfig, accessor, {
                        palette: newPalette,
                      }),
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

function updateMetricConfig(
  configs: DecorationState[],
  id: string,
  params: Partial<DecorationState>
) {
  const currentConfig = configs.find(({ metricId }) => metricId === id);
  return configs
    .filter((config) => config !== currentConfig)
    .concat(currentConfig ? { ...currentConfig, ...params } : { metricId: id, ...params });
}
