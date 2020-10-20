/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './xy_config_panel.scss';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Position } from '@elastic/charts';
import { debounce } from 'lodash';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiFormRow,
  EuiText,
  htmlIdGenerator,
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
import { State, SeriesType, visualizationTypes, YAxisMode, AxesSettingsConfig } from './types';
import { isHorizontalChart, isHorizontalSeries, getSeriesColor } from './state_helpers';
import { trackUiEvent } from '../lens_ui_telemetry';
import { fittingFunctionDefinitions } from './fitting_functions';
import { ToolbarPopover, LegendSettingsPopover } from '../shared_components';
import { AxisSettingsPopover } from './axis_settings_popover';
import { TooltipWrapper } from './tooltip_wrapper';
import { getAxesConfiguration } from './axes_configuration';

type UnwrapArray<T> = T extends Array<infer P> ? P : T;
type AxesSettingsConfigKeys = keyof AxesSettingsConfig;

function updateLayer(state: State, layer: UnwrapArray<State['layers']>, index: number): State {
  const newLayers = [...state.layers];
  newLayers[index] = layer;

  return {
    ...state,
    layers: newLayers,
  };
}

const legendOptions: Array<{ id: string; value: 'auto' | 'show' | 'hide'; label: string }> = [
  {
    id: `xy_legend_auto`,
    value: 'auto',
    label: i18n.translate('xpack.lens.xyChart.legendVisibility.auto', {
      defaultMessage: 'Auto',
    }),
  },
  {
    id: `xy_legend_show`,
    value: 'show',
    label: i18n.translate('xpack.lens.xyChart.legendVisibility.show', {
      defaultMessage: 'Show',
    }),
  },
  {
    id: `xy_legend_hide`,
    value: 'hide',
    label: i18n.translate('xpack.lens.xyChart.legendVisibility.hide', {
      defaultMessage: 'Hide',
    }),
  },
];

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
        options={visualizationTypes
          .filter((t) => isHorizontalSeries(t.id as SeriesType) === horizontalOnly)
          .map((t) => ({
            id: t.id,
            label: t.label,
            iconType: t.icon || 'empty',
            'data-test-subj': `lnsXY_seriesType-${t.id}`,
          }))}
        idSelected={layer.seriesType}
        onChange={(seriesType) => {
          trackUiEvent('xy_change_layer_display');
          props.setState(
            updateLayer(state, { ...layer, seriesType: seriesType as SeriesType }, index)
          );
        }}
        isIconOnly
      />
    </EuiFormRow>
  );
}

export function XyToolbar(props: VisualizationToolbarProps<State>) {
  const { state, setState } = props;

  const hasNonBarSeries = state?.layers.some(({ seriesType }) =>
    ['area_stacked', 'area', 'line'].includes(seriesType)
  );

  const shouldRotate = state?.layers.length ? isHorizontalChart(state.layers) : false;
  const axisGroups = getAxesConfiguration(state?.layers, shouldRotate);

  const tickLabelsVisibilitySettings = {
    x: state?.tickLabelsVisibilitySettings?.x ?? true,
    yLeft: state?.tickLabelsVisibilitySettings?.yLeft ?? true,
    yRight: state?.tickLabelsVisibilitySettings?.yRight ?? true,
  };
  const onTickLabelsVisibilitySettingsChange = (optionId: AxesSettingsConfigKeys): void => {
    const newTickLabelsVisibilitySettings = {
      ...tickLabelsVisibilitySettings,
      ...{
        [optionId]: !tickLabelsVisibilitySettings[optionId],
      },
    };
    setState({
      ...state,
      tickLabelsVisibilitySettings: newTickLabelsVisibilitySettings,
    });
  };

  const gridlinesVisibilitySettings = {
    x: state?.gridlinesVisibilitySettings?.x ?? true,
    yLeft: state?.gridlinesVisibilitySettings?.yLeft ?? true,
    yRight: state?.gridlinesVisibilitySettings?.yRight ?? true,
  };

  const onGridlinesVisibilitySettingsChange = (optionId: AxesSettingsConfigKeys): void => {
    const newGridlinesVisibilitySettings = {
      ...gridlinesVisibilitySettings,
      ...{
        [optionId]: !gridlinesVisibilitySettings[optionId],
      },
    };
    setState({
      ...state,
      gridlinesVisibilitySettings: newGridlinesVisibilitySettings,
    });
  };

  const axisTitlesVisibilitySettings = {
    x: state?.axisTitlesVisibilitySettings?.x ?? true,
    yLeft: state?.axisTitlesVisibilitySettings?.yLeft ?? true,
    yRight: state?.axisTitlesVisibilitySettings?.yRight ?? true,
  };
  const onAxisTitlesVisibilitySettingsChange = (
    axis: AxesSettingsConfigKeys,
    checked: boolean
  ): void => {
    const newAxisTitlesVisibilitySettings = {
      ...axisTitlesVisibilitySettings,
      ...{
        [axis]: checked,
      },
    };
    setState({
      ...state,
      axisTitlesVisibilitySettings: newAxisTitlesVisibilitySettings,
    });
  };

  const legendMode =
    state?.legend.isVisible && !state?.legend.showSingleSeries
      ? 'auto'
      : !state?.legend.isVisible
      ? 'hide'
      : 'show';
  return (
    <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none" responsive={false}>
          <TooltipWrapper
            tooltipContent={i18n.translate('xpack.lens.xyChart.fittingDisabledHelpText', {
              defaultMessage: 'This setting only applies to line and area charts.',
            })}
            condition={!hasNonBarSeries}
          >
            <ToolbarPopover
              title={i18n.translate('xpack.lens.xyChart.valuesLabel', {
                defaultMessage: 'Values',
              })}
              isDisabled={!hasNonBarSeries}
              type="values"
              groupPosition="left"
              buttonDataTestSubj="lnsMissingValuesButton"
            >
              <EuiFormRow
                display="columnCompressed"
                label={i18n.translate('xpack.lens.xyChart.missingValuesLabel', {
                  defaultMessage: 'Missing values',
                })}
              >
                <EuiSuperSelect
                  data-test-subj="lnsMissingValuesSelect"
                  compressed
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
                  valueOfSelected={state?.fittingFunction || 'None'}
                  onChange={(value) => setState({ ...state, fittingFunction: value })}
                  itemLayoutAlign="top"
                  hasDividers
                />
              </EuiFormRow>
            </ToolbarPopover>
          </TooltipWrapper>
          <LegendSettingsPopover
            legendOptions={legendOptions}
            mode={legendMode}
            onDisplayChange={(optionId) => {
              const newMode = legendOptions.find(({ id }) => id === optionId)!.value;
              if (newMode === 'auto') {
                setState({
                  ...state,
                  legend: { ...state.legend, isVisible: true, showSingleSeries: false },
                });
              } else if (newMode === 'show') {
                setState({
                  ...state,
                  legend: { ...state.legend, isVisible: true, showSingleSeries: true },
                });
              } else if (newMode === 'hide') {
                setState({
                  ...state,
                  legend: { ...state.legend, isVisible: false, showSingleSeries: false },
                });
              }
            }}
            position={state?.legend.position}
            onPositionChange={(id) => {
              setState({
                ...state,
                legend: { ...state.legend, position: id as Position },
              });
            }}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none" responsive={false}>
          <TooltipWrapper
            tooltipContent={
              shouldRotate
                ? i18n.translate('xpack.lens.xyChart.bottomAxisDisabledHelpText', {
                    defaultMessage: 'This setting only applies when bottom axis is enabled.',
                  })
                : i18n.translate('xpack.lens.xyChart.leftAxisDisabledHelpText', {
                    defaultMessage: 'This setting only applies when left axis is enabled.',
                  })
            }
            condition={
              Object.keys(axisGroups.find((group) => group.groupId === 'left') || {}).length === 0
            }
          >
            <AxisSettingsPopover
              axis="yLeft"
              layers={state?.layers}
              axisTitle={state?.yTitle}
              updateTitleState={(value) => setState({ ...state, yTitle: value })}
              areTickLabelsVisible={tickLabelsVisibilitySettings.yLeft}
              toggleTickLabelsVisibility={onTickLabelsVisibilitySettingsChange}
              areGridlinesVisible={gridlinesVisibilitySettings.yLeft}
              toggleGridlinesVisibility={onGridlinesVisibilitySettingsChange}
              isDisabled={
                Object.keys(axisGroups.find((group) => group.groupId === 'left') || {}).length === 0
              }
              isAxisTitleVisible={axisTitlesVisibilitySettings.yLeft}
              toggleAxisTitleVisibility={onAxisTitlesVisibilitySettingsChange}
            />
          </TooltipWrapper>
          <AxisSettingsPopover
            axis="x"
            layers={state?.layers}
            axisTitle={state?.xTitle}
            updateTitleState={(value) => setState({ ...state, xTitle: value })}
            areTickLabelsVisible={tickLabelsVisibilitySettings.x}
            toggleTickLabelsVisibility={onTickLabelsVisibilitySettingsChange}
            areGridlinesVisible={gridlinesVisibilitySettings.x}
            toggleGridlinesVisibility={onGridlinesVisibilitySettingsChange}
            isAxisTitleVisible={axisTitlesVisibilitySettings.x}
            toggleAxisTitleVisibility={onAxisTitlesVisibilitySettingsChange}
          />
          <TooltipWrapper
            tooltipContent={
              shouldRotate
                ? i18n.translate('xpack.lens.xyChart.topAxisDisabledHelpText', {
                    defaultMessage: 'This setting only applies when top axis is enabled.',
                  })
                : i18n.translate('xpack.lens.xyChart.rightAxisDisabledHelpText', {
                    defaultMessage: 'This setting only applies when right axis is enabled.',
                  })
            }
            condition={
              Object.keys(axisGroups.find((group) => group.groupId === 'right') || {}).length === 0
            }
          >
            <AxisSettingsPopover
              axis="yRight"
              layers={state?.layers}
              axisTitle={state?.yRightTitle}
              updateTitleState={(value) => setState({ ...state, yRightTitle: value })}
              areTickLabelsVisible={tickLabelsVisibilitySettings.yRight}
              toggleTickLabelsVisibility={onTickLabelsVisibilitySettingsChange}
              areGridlinesVisible={gridlinesVisibilitySettings.yRight}
              toggleGridlinesVisibility={onGridlinesVisibilitySettingsChange}
              isDisabled={
                Object.keys(axisGroups.find((group) => group.groupId === 'right') || {}).length ===
                0
              }
              isAxisTitleVisible={axisTitlesVisibilitySettings.yRight}
              toggleAxisTitleVisibility={onAxisTitlesVisibilitySettingsChange}
            />
          </TooltipWrapper>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
const idPrefix = htmlIdGenerator()();

export function DimensionEditor(props: VisualizationDimensionEditorProps<State>) {
  const { state, setState, layerId, accessor } = props;
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index];
  const isHorizontal = isHorizontalChart(state.layers);
  const axisMode =
    (layer.yConfig &&
      layer.yConfig?.find((yAxisConfig) => yAxisConfig.forAccessor === accessor)?.axisMode) ||
    'auto';

  return (
    <>
      <ColorPicker {...props} />

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
          name="axisSide"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}auto`,
              label: i18n.translate('xpack.lens.xyChart.axisSide.auto', {
                defaultMessage: 'Auto',
              }),
            },
            {
              id: `${idPrefix}left`,
              label: isHorizontal
                ? i18n.translate('xpack.lens.xyChart.axisSide.bottom', {
                    defaultMessage: 'Bottom',
                  })
                : i18n.translate('xpack.lens.xyChart.axisSide.left', {
                    defaultMessage: 'Left',
                  }),
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
    </>
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
      'Individual series cannot be custom colored when the layer includes a “Break down by.“',
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
    [state, setState, layer, accessor, index]
  );

  const colorPicker = (
    <EuiColorPicker
      data-test-subj="indexPattern-dimension-colorPicker"
      compressed
      isClearable
      onChange={handleColor}
      color={disabled ? '' : color}
      disabled={disabled}
      placeholder={i18n.translate('xpack.lens.xyChart.seriesColor.auto', {
        defaultMessage: 'Auto',
      })}
      aria-label={i18n.translate('xpack.lens.xyChart.seriesColor.label', {
        defaultMessage: 'Series color',
      })}
    />
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
          {colorPicker}
        </EuiToolTip>
      ) : (
        colorPicker
      )}
    </EuiFormRow>
  );
};
