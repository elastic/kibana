/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonGroup,
  EuiFormRow,
  htmlIdGenerator,
  EuiForm,
  EuiColorPicker,
  EuiCallOut,
  EuiInputPopover,
  EuiFieldText,
  EuiSpacer,
  EuiIcon,
  EuiFormControlLayout,
  EuiColorPickerSwatch,
} from '@elastic/eui';
import { State, SeriesType, visualizationTypes, YAxisMode } from './types';
import { VisualizationDimensionEditorProps, VisualizationLayerWidgetProps } from '../types';
import { isHorizontalChart, isHorizontalSeries } from './state_helpers';
import { trackUiEvent } from '../lens_ui_telemetry';
import { getColor } from './color_configuration';

type UnwrapArray<T> = T extends Array<infer P> ? P : T;

function updateLayer(state: State, layer: UnwrapArray<State['layers']>, index: number): State {
  const newLayers = [...state.layers];
  newLayers[index] = layer;

  return {
    ...state,
    layers: newLayers,
  };
}

export function LayerContextMenu(props: VisualizationLayerWidgetProps<State>) {
  const { state, layerId } = props;
  const horizontalOnly = isHorizontalChart(state.layers);
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index];

  if (!layer) {
    return null;
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.xyChart.chartTypeLabel', {
        defaultMessage: 'Chart type',
      })}
    >
      <EuiButtonGroup
        legend={i18n.translate('xpack.lens.xyChart.chartTypeLegend', {
          defaultMessage: 'Chart type',
        })}
        name="chartType"
        className="eui-displayInlineBlock"
        data-test-subj="lnsXY_seriesType"
        options={visualizationTypes
          .filter((t) => isHorizontalSeries(t.id as SeriesType) === horizontalOnly)
          .map((t) => ({
            id: t.id,
            label: t.label,
            iconType: t.icon || 'empty',
          }))}
        idSelected={layer.seriesType}
        onChange={(seriesType) => {
          trackUiEvent('xy_change_layer_display');
          props.setState(
            updateLayer(state, { ...layer, seriesType: seriesType as SeriesType }, index)
          );
        }}
        isIconOnly
        buttonSize="compressed"
      />
    </EuiFormRow>
  );
}

const idPrefix = htmlIdGenerator()();

export function DimensionEditor({
  state,
  setState,
  layerId,
  accessor,
}: VisualizationDimensionEditorProps<State>) {
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index];
  const axisMode =
    (layer.yConfig &&
      layer.yConfig?.find((yAxisConfig) => yAxisConfig.forAccessor === accessor)?.axisMode) ||
    'auto';

  const color = getColor(layer, accessor);
  return (
    <EuiForm>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.xyChart.axisSide.label', {
          defaultMessage: 'Axis side',
        })}
      >
        <EuiButtonGroup
          legend={i18n.translate('xpack.lens.xyChart.axisSide.label', {
            defaultMessage: 'Axis side',
          })}
          name="axisSide"
          buttonSize="compressed"
          className="eui-displayInlineBlock"
          options={[
            {
              id: `${idPrefix}auto`,
              label: i18n.translate('xpack.lens.xyChart.axisSide.auto', {
                defaultMessage: 'Auto',
              }),
            },
            {
              id: `${idPrefix}left`,
              label: i18n.translate('xpack.lens.xyChart.axisSide.left', {
                defaultMessage: 'Left',
              }),
            },
            {
              id: `${idPrefix}right`,
              label: i18n.translate('xpack.lens.xyChart.axisSide.right', {
                defaultMessage: 'Right',
              }),
            },
          ]}
          idSelected={`${idPrefix}${axisMode}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as YAxisMode;
            const newYAxisConfigs = [...(layer.yConfig || [])];
            const existingIndex = newYAxisConfigs.findIndex(
              (yAxisConfig) => yAxisConfig.forAccessor === accessor
            );
            if (existingIndex !== -1) {
              newYAxisConfigs[existingIndex].axisMode = newMode;
            } else {
              newYAxisConfigs.push({
                forAccessor: accessor,
                axisMode: newMode,
              });
            }
            setState(updateLayer(state, { ...layer, yConfig: newYAxisConfigs }, index));
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.xyChart.seriesColor.label', {
          defaultMessage: 'Series Color',
        })}
      >
        <>
          <EuiColorPicker
            disabled={!!layer.splitAccessor}
            onChange={(newColor) => {
              const newYConfigs = [...(layer.yConfig || [])];
              const existingIndex = newYConfigs.findIndex(
                (yConfig) => yConfig.forAccessor === accessor
              );
              if (existingIndex !== -1) {
                newYConfigs[existingIndex].color = newColor;
              } else {
                newYConfigs.push({
                  forAccessor: accessor,
                  color: newColor,
                  axisMode: 'auto',
                });
              }
              setState(updateLayer(state, { ...layer, yConfig: newYConfigs }, index));
            }}
            color={color}
            secondaryInputDisplay="top"
            button={<EuiColorPickerSwatch color={color} aria-label="Select a new color" />}
          />
          {!!layer.splitAccessor && !color && (
            <div>default color is displayed, you cannot edit series with split accessor</div>
          )}
          {!layer.splitAccessor && !color && <div>default color is displayed</div>}
          {!layer.splitAccessor && color && <div>custom color is displayed</div>}
        </>
      </EuiFormRow>
      {!!layer.splitAccessor && (
        <EuiFormRow>
          <EuiCallOut size="s" color="danger">
            You cannot apply color on layer with break down by.
          </EuiCallOut>
        </EuiFormRow>
      )}
    </EuiForm>
  );
}
