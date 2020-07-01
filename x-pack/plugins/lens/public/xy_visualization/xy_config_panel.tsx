/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonGroup,
  EuiFormRow,
  htmlIdGenerator,
  EuiForm,
  EuiColorPicker,
  EuiToolTip,
  EuiInputPopover,
  EuiFieldText,
  EuiFormControlLayout,
} from '@elastic/eui';
import { State, SeriesType, visualizationTypes, YAxisMode } from './types';
import { VisualizationDimensionEditorProps, VisualizationLayerWidgetProps } from '../types';
import { isHorizontalChart, isHorizontalSeries, getSeriesColor } from './state_helpers';
import { trackUiEvent } from '../lens_ui_telemetry';

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

export function DimensionEditor(props: VisualizationDimensionEditorProps<State>) {
  const { state, setState, layerId, accessor } = props;
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index];
  const axisMode =
    (layer.yConfig &&
      layer.yConfig?.find((yAxisConfig) => yAxisConfig.forAccessor === accessor)?.axisMode) ||
    'auto';

  return (
    <EuiForm>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.xyChart.seriesColor.label', {
          defaultMessage: 'Series Color',
        })}
      >
        <ColorPicker {...props} />
      </EuiFormRow>
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
    </EuiForm>
  );
}

const tooltipContent = {
  auto: i18n.translate('xpack.lens.configPanel.color.tooltip.auto', {
    defaultMessage: 'Lens automatically picks colors for you unless you specify a custom color.',
  }),
  custom: i18n.translate('xpack.lens.configPanel.color.tooltip.custom', {
    defaultMessage: 'Clear the custom color to return to “Auto” mode.',
  }),
  disabled: i18n.translate('xpack.lens.configPanel.color.tooltip.disabled', {
    defaultMessage:
      'Individual series cannot be custom colored when the layer includes a “Split by.“',
  }),
};

const autoMessage = i18n.translate('xpack.lens.configPanel.color.auto', {
  defaultMessage: 'Auto',
});

const DisabledColorPicker = () => (
  <EuiToolTip position="top" content={tooltipContent.disabled} delay="long">
    <EuiFieldText
      compressed={true}
      type="text"
      disabled={true}
      icon={{
        type: 'stopSlash',
      }}
      className="euiFieldText"
      value=""
      placeholder={autoMessage}
      aria-label="color picker disabled"
    />
  </EuiToolTip>
);

const ColorPicker = ({
  state,
  setState,
  layerId,
  accessor,
}: VisualizationDimensionEditorProps<State>) => {
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index];
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (layer.splitAccessor) {
    return <DisabledColorPicker />;
  }

  const color = getSeriesColor(layer, accessor);
  const toggleIsPopoverOpen = (shouldBeOpen = !isPopoverOpen) => {
    setIsPopoverOpen(shouldBeOpen);
  };

  const handleColor = (newColor = '') => {
    const newYConfigs = [...(layer.yConfig || [])];
    const existingIndex = newYConfigs.findIndex((yConfig) => yConfig.forAccessor === accessor);
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
  };

  return (
    <EuiToolTip
      position="top"
      content={color ? tooltipContent.custom : tooltipContent.auto}
      delay="long"
    >
      <EuiInputPopover
        input={
          <EuiFormControlLayout
            className="lnsConfigPanel__colorLayout"
            clear={color ? { onClick: () => handleColor() } : undefined}
            icon={{ type: 'arrowDown', side: 'right' }}
          >
            <EuiFieldText
              compressed={true}
              type="text"
              onFocus={(ev) => toggleIsPopoverOpen(true)}
              icon={{
                type: color ? 'stopFilled' : 'stopSlash',
                style: { color: color || 'inherit' },
              }}
              className="lnsConfigPanel__colorTextField"
              value={color?.toUpperCase() || ''}
              placeholder={autoMessage}
              aria-label="Use aria labels when no actual label is in use"
            />
          </EuiFormControlLayout>
        }
        isOpen={isPopoverOpen}
        closePopover={() => toggleIsPopoverOpen(false)}
        display="inlineBlock"
      >
        <EuiColorPicker display="inline" onChange={handleColor} color={color} />
      </EuiInputPopover>
    </EuiToolTip>
  );
};
