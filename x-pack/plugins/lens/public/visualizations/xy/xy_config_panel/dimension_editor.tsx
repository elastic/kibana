/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/visualization-ui-components';
import { ColorPicker } from '@kbn/visualization-ui-components';

import {
  EuiBadge,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  htmlIdGenerator,
} from '@elastic/eui';
import {
  PaletteRegistry,
  ColorMapping,
  DEFAULT_COLOR_MAPPING_CONFIG,
  CategoricalColorMapping,
  PaletteOutput,
  SPECIAL_TOKENS_STRING_CONVERTION,
  AVAILABLE_PALETTES,
  getColorsFromMapping,
} from '@kbn/coloring';
import { getColorCategories } from '@kbn/chart-expressions-common';
import type { VisualizationDimensionEditorProps } from '../../../types';
import { State, XYState, XYDataLayerConfig, YConfig, YAxisMode } from '../types';
import { FormatFactory } from '../../../../common/types';
import { getSeriesColor, isHorizontalChart } from '../state_helpers';
import { PalettePanelContainer, PalettePicker } from '../../../shared_components';
import { getDataLayers } from '../visualization_helpers';
import { CollapseSetting } from '../../../shared_components/collapse_setting';
import { getSortedAccessors } from '../to_expression';
import { getColorAssignments, getAssignedColorConfig } from '../color_assignment';
import { trackUiCounterEvents } from '../../../lens_ui_telemetry';

type UnwrapArray<T> = T extends Array<infer P> ? P : T;

export function updateLayer(
  state: State,
  layer: UnwrapArray<State['layers']>,
  index: number
): State {
  const newLayers = [...state.layers];
  newLayers[index] = layer;

  return {
    ...state,
    layers: newLayers,
  };
}

export const idPrefix = htmlIdGenerator()();

export function DataDimensionEditor(
  props: VisualizationDimensionEditorProps<State> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
    darkMode: boolean;
  }
) {
  const { state, layerId, accessor, darkMode, isInlineEditing } = props;
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index] as XYDataLayerConfig;
  const canUseColorMapping = layer.colorMapping ? true : false;

  const [useNewColorMapping, setUseNewColorMapping] = useState(canUseColorMapping);

  const { inputValue: localState, handleInputChange: setLocalState } = useDebouncedValue<XYState>({
    value: props.state,
    onChange: props.setState,
  });

  const localYConfig = layer?.yConfig?.find((yAxisConfig) => yAxisConfig.forAccessor === accessor);
  const axisMode = localYConfig?.axisMode || 'auto';

  const setConfig = useCallback(
    (yConfig: Partial<YConfig> | undefined) => {
      if (yConfig == null) {
        return;
      }
      const newYConfigs = [...(layer.yConfig || [])];
      const existingIndex = newYConfigs.findIndex(
        (yAxisConfig) => yAxisConfig.forAccessor === accessor
      );
      if (existingIndex !== -1) {
        newYConfigs[existingIndex] = { ...newYConfigs[existingIndex], ...yConfig };
      } else {
        newYConfigs.push({
          forAccessor: accessor,
          ...yConfig,
        });
      }
      setLocalState(updateLayer(localState, { ...layer, yConfig: newYConfigs }, index));
    },
    [accessor, index, localState, layer, setLocalState]
  );

  const setColorMapping = useCallback(
    (colorMapping?: ColorMapping.Config) => {
      setLocalState(updateLayer(localState, { ...layer, colorMapping }, index));
    },
    [index, localState, layer, setLocalState]
  );
  const setPalette = useCallback(
    (palette: PaletteOutput) => {
      setLocalState(updateLayer(localState, { ...layer, palette }, index));
    },
    [index, localState, layer, setLocalState]
  );

  const overwriteColor = getSeriesColor(layer, accessor);
  const assignedColor = useMemo(() => {
    const sortedAccessors: string[] = getSortedAccessors(
      props.frame.datasourceLayers[layer.layerId],
      layer
    );
    const colorAssignments = getColorAssignments(
      getDataLayers(state.layers),
      { tables: props.frame.activeData ?? {} },
      props.formatFactory
    );

    return getAssignedColorConfig(
      {
        ...layer,
        accessors: sortedAccessors.filter((sorted) => layer.accessors.includes(sorted)),
      },
      accessor,
      colorAssignments,
      props.frame,

      props.paletteService
    ).color;
  }, [props.frame, props.paletteService, state.layers, accessor, props.formatFactory, layer]);

  const localLayer: XYDataLayerConfig = layer;

  const colors = layer.colorMapping
    ? getColorsFromMapping(props.darkMode, layer.colorMapping)
    : props.paletteService
        .get(layer.palette?.name || 'default')
        .getCategoricalColors(10, layer.palette);

  const table = props.frame.activeData?.[layer.layerId];
  const { splitAccessor } = layer;
  const splitCategories = getColorCategories(table?.rows ?? [], splitAccessor);

  if (props.groupId === 'breakdown' && !layer.collapseFn) {
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
          siblingRef={props.panelRef}
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
                    trackUiCounterEvents(
                      `color_mapping_switch_${checked ? 'enabled' : 'disabled'}`
                    );
                    setColorMapping(checked ? { ...DEFAULT_COLOR_MAPPING_CONFIG } : undefined);
                    setUseNewColorMapping(checked);
                  }}
                />
                <EuiSpacer size="s" />
              </EuiFlexItem>
              <EuiFlexItem>
                {canUseColorMapping || useNewColorMapping ? (
                  <CategoricalColorMapping
                    isDarkMode={darkMode}
                    model={layer.colorMapping ?? { ...DEFAULT_COLOR_MAPPING_CONFIG }}
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
                    palettes={props.paletteService}
                    activePalette={localLayer?.palette}
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

  const isHorizontal = isHorizontalChart(state.layers);
  const disabledMessage = Boolean(!localLayer.collapseFn && localLayer.splitAccessor)
    ? i18n.translate('xpack.lens.xyChart.colorPicker.tooltip.disabled', {
        defaultMessage:
          'You are unable to apply custom colors to individual series when the layer includes a "Break down by" field.',
      })
    : undefined;

  return (
    <>
      <ColorPicker
        {...props}
        overwriteColor={overwriteColor}
        defaultColor={assignedColor}
        disabledMessage={disabledMessage}
        setConfig={setConfig}
      />

      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.axisSide.label', {
          defaultMessage: 'Axis side',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.xyChart.axisSide.label', {
            defaultMessage: 'Axis side',
          })}
          data-test-subj="lnsXY_axisSide_groups"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}left`,
              label: isHorizontal
                ? i18n.translate('xpack.lens.xyChart.axisSide.bottom', {
                    defaultMessage: 'Bottom',
                  })
                : i18n.translate('xpack.lens.xyChart.axisSide.left', {
                    defaultMessage: 'Left',
                  }),
              'data-test-subj': 'lnsXY_axisSide_groups_left',
            },
            {
              id: `${idPrefix}auto`,
              label: i18n.translate('xpack.lens.xyChart.axisSide.auto', {
                defaultMessage: 'Auto',
              }),
              'data-test-subj': 'lnsXY_axisSide_groups_auto',
            },
            {
              id: `${idPrefix}right`,
              label: isHorizontal
                ? i18n.translate('xpack.lens.xyChart.axisSide.top', {
                    defaultMessage: 'Top',
                  })
                : i18n.translate('xpack.lens.xyChart.axisSide.right', {
                    defaultMessage: 'Right',
                  }),
              'data-test-subj': 'lnsXY_axisSide_groups_right',
            },
          ]}
          idSelected={`${idPrefix}${axisMode}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as YAxisMode;
            setConfig({ axisMode: newMode });
          }}
        />
      </EuiFormRow>
    </>
  );
}

export function DataDimensionEditorDataSectionExtra(
  props: VisualizationDimensionEditorProps<State> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
  }
) {
  const { state, layerId } = props;
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index] as XYDataLayerConfig;

  const { inputValue: localState, handleInputChange: setLocalState } = useDebouncedValue<XYState>({
    value: props.state,
    onChange: props.setState,
  });

  if (props.groupId === 'breakdown') {
    return (
      <>
        <CollapseSetting
          value={layer.collapseFn || ''}
          onChange={(collapseFn) => {
            setLocalState(updateLayer(localState, { ...layer, collapseFn }, index));
          }}
        />
      </>
    );
  }

  return null;
}
