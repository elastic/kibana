/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiFormRow,
  EuiPopover,
  EuiText,
  htmlIdGenerator,
  EuiForm,
  EuiColorPicker,
  EuiColorPickerProps,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import {
  VisualizationLayerWidgetProps,
  VisualizationDimensionEditorProps,
  VisualizationToolbarProps,
} from '../types';
import { State, SeriesType, visualizationTypes, YAxisMode } from './types';
import { isHorizontalChart, isHorizontalSeries, getSeriesColor } from './state_helpers';
import { trackUiEvent } from '../lens_ui_telemetry';
import { fittingFunctionDefinitions } from './fitting_functions';

import './xy_config_panel.scss';

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

export function XyToolbar(props: VisualizationToolbarProps<State>) {
  const [open, setOpen] = useState(false);
  const hasNonBarSeries = props.state?.layers.some(
    (layer) => layer.seriesType === 'line' || layer.seriesType === 'area'
  );
  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiPopover
          panelClassName="lnsXyToolbar__popover"
          button={
            <EuiButtonEmpty
              color="text"
              iconType="arrowDown"
              iconSide="right"
              onClick={() => {
                setOpen(!open);
              }}
            >
              {i18n.translate('xpack.lens.xyChart.settingsLabel', { defaultMessage: 'Settings' })}
            </EuiButtonEmpty>
          }
          isOpen={open}
          closePopover={() => {
            setOpen(false);
          }}
          anchorPosition="downRight"
        >
          <EuiFormRow
            display="columnCompressed"
            label={i18n.translate('xpack.lens.xyChart.fittingLabel', {
              defaultMessage: 'Fill missing values',
            })}
            helpText={
              !hasNonBarSeries &&
              i18n.translate('xpack.lens.xyChart.fittingDisabledHelpText', {
                defaultMessage:
                  'This setting only applies to line charts and unstacked area charts.',
              })
            }
          >
            <EuiSuperSelect
              compressed
              disabled={!hasNonBarSeries}
              options={fittingFunctionDefinitions.map(({ id, title, description }) => {
                return {
                  value: id,
                  dropdownDisplay: (
                    <>
                      <strong>{title}</strong>
                      <EuiText size="xs" color="subdued">
                        <p>{description}</p>
                      </EuiText>
                    </>
                  ),
                  inputDisplay: title,
                };
              })}
              valueOfSelected={props.state?.fittingFunction || 'None'}
              onChange={(value) => props.setState({ ...props.state, fittingFunction: value })}
              itemLayoutAlign="top"
              hasDividers
            />
          </EuiFormRow>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
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
      <ColorPicker {...props} />

      <EuiFormRow
        display="columnCompressed"
        fullWidth
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
      'Individual series cannot be custom colored when the layer includes a “Break down by“',
  }),
};

const ColorPicker = ({
  state,
  setState,
  layerId,
  accessor,
}: VisualizationDimensionEditorProps<State>) => {
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index];
  const disabled = !!layer.splitAccessor;

  const [color, setColor] = useState(getSeriesColor(layer, accessor));

  const handleColor: EuiColorPickerProps['onChange'] = (text, output) => {
    setColor(text);
    if (output.isValid || text === '') {
      updateColorInState(text, output);
    }
  };

  const updateColorInState: EuiColorPickerProps['onChange'] = React.useMemo(
    () =>
      debounce((text, output) => {
        const newYConfigs = [...(layer.yConfig || [])];
        const existingIndex = newYConfigs.findIndex((yConfig) => yConfig.forAccessor === accessor);
        if (existingIndex !== -1) {
          if (text === '') {
            delete newYConfigs[existingIndex].color;
          } else {
            newYConfigs[existingIndex].color = output.hex;
          }
        } else {
          newYConfigs.push({
            forAccessor: accessor,
            color: output.hex,
          });
        }
        setState(updateLayer(state, { ...layer, yConfig: newYConfigs }, index));
      }, 256),
    [state, layer, accessor, index]
  );

  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={
        <EuiToolTip
          delay="long"
          position="top"
          content={color && !disabled ? tooltipContent.custom : tooltipContent.auto}
        >
          <span>
            {i18n.translate('xpack.lens.xyChart.seriesColor.label', {
              defaultMessage: 'Series color',
            })}{' '}
            <EuiIcon type="questionInCircle" color="subdued" size="s" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      }
    >
      {disabled ? (
        <EuiToolTip
          position="top"
          content={tooltipContent.disabled}
          delay="long"
          anchorClassName="eui-displayBlock"
        >
          <EuiColorPicker
            compressed
            onChange={handleColor}
            color=""
            disabled
            aria-label={i18n.translate('xpack.lens.xyChart.seriesColor.label', {
              defaultMessage: 'Series color',
            })}
          />
        </EuiToolTip>
      ) : (
        <EuiColorPicker
          compressed
          onChange={handleColor}
          color={color}
          aria-label={i18n.translate('xpack.lens.xyChart.seriesColor.label', {
            defaultMessage: 'Series color',
          })}
        />
      )}
    </EuiFormRow>
  );
};
