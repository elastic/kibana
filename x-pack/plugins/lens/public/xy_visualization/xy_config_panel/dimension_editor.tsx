/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow, htmlIdGenerator } from '@elastic/eui';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { VisualizationDimensionEditorProps } from '../../types';
import { State, XYState, XYDataLayerConfig, YLensConfig as YConfig } from '../types';
import { FormatFactory } from '../../../common';
import { YAxisMode } from '../../../../../../src/plugins/chart_expressions/expression_xy/common';
import { isHorizontalChart } from '../state_helpers';
import { ColorPicker } from './color_picker';
import { PalettePicker, useDebouncedValue } from '../../shared_components';
import { isAnnotationsLayer, isReferenceLayer } from '../visualization_helpers';
import { ReferenceLinePanel } from './reference_line_panel';
import { AnnotationsPanel } from '../annotations/config_panel';

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

export function DimensionEditor(
  props: VisualizationDimensionEditorProps<State> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, layerId, accessor } = props;
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index] as XYDataLayerConfig;

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

  if (isAnnotationsLayer(layer)) {
    return <AnnotationsPanel {...props} />;
  }

  if (isReferenceLayer(layer)) {
    return <ReferenceLinePanel {...props} />;
  }

  const localLayer: XYDataLayerConfig = layer;
  if (props.groupId === 'breakdown') {
    return (
      <>
        <PalettePicker
          palettes={props.paletteService}
          activePalette={localLayer?.palette}
          setPalette={(newPalette) => {
            setState(updateLayer(localState, { ...localLayer, palette: newPalette }, index));
          }}
        />
      </>
    );
  }

  const isHorizontal = isHorizontalChart(state.layers);

  return (
    <>
      <ColorPicker {...props} disabled={Boolean(localLayer.splitAccessor)} setConfig={setConfig} />

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
          name="axisSide"
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
