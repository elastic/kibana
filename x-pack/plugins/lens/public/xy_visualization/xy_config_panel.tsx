/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './xy_config_panel.scss';
import React, { useMemo, useState } from 'react';
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
  EuiIconTip,
} from '@elastic/eui';
import { PaletteRegistry } from 'src/plugins/charts/public';
import {
  VisualizationLayerWidgetProps,
  VisualizationToolbarProps,
  VisualizationDimensionEditorProps,
  FormatFactory,
} from '../types';
import {
  State,
  SeriesType,
  visualizationTypes,
  YAxisMode,
  AxesSettingsConfig,
  ValidLayer,
} from './types';
import {
  isHorizontalChart,
  isHorizontalSeries,
  getSeriesColor,
  hasHistogramSeries,
} from './state_helpers';
import { trackUiEvent } from '../lens_ui_telemetry';
import { fittingFunctionDefinitions } from './fitting_functions';
import { ToolbarPopover, LegendSettingsPopover } from '../shared_components';
import { AxisSettingsPopover } from './axis_settings_popover';
import { TooltipWrapper } from './tooltip_wrapper';
import { getAxesConfiguration } from './axes_configuration';
import { PalettePicker } from '../shared_components';
import { getAccessorColorConfig, getColorAssignments } from './color_assignment';
import { getSortedAccessors } from './to_expression';

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

const valueLabelsOptions: Array<{
  id: string;
  value: 'hide' | 'inside' | 'outside';
  label: string;
  'data-test-subj': string;
}> = [
  {
    id: `value_labels_hide`,
    value: 'hide',
    label: i18n.translate('xpack.lens.xyChart.valueLabelsVisibility.auto', {
      defaultMessage: 'Hide',
    }),
    'data-test-subj': 'lnsXY_valueLabels_hide',
  },
  {
    id: `value_labels_inside`,
    value: 'inside',
    label: i18n.translate('xpack.lens.xyChart.valueLabelsVisibility.inside', {
      defaultMessage: 'Show',
    }),
    'data-test-subj': 'lnsXY_valueLabels_inside',
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

function getValueLabelDisableReason({
  isAreaPercentage,
  isHistogramSeries,
}: {
  isAreaPercentage: boolean;
  isHistogramSeries: boolean;
}): string {
  if (isHistogramSeries) {
    return i18n.translate('xpack.lens.xyChart.valuesHistogramDisabledHelpText', {
      defaultMessage: 'This setting cannot be changed on histograms.',
    });
  }
  if (isAreaPercentage) {
    return i18n.translate('xpack.lens.xyChart.valuesPercentageDisabledHelpText', {
      defaultMessage: 'This setting cannot be changed on percentage area charts.',
    });
  }
  return i18n.translate('xpack.lens.xyChart.valuesStackedDisabledHelpText', {
    defaultMessage: 'This setting cannot be changed on stacked or percentage bar charts',
  });
}

export function XyToolbar(props: VisualizationToolbarProps<State>) {
  const { state, setState, frame } = props;

  const hasNonBarSeries = state?.layers.some(({ seriesType }) =>
    ['area_stacked', 'area', 'line'].includes(seriesType)
  );

  const hasBarNotStacked = state?.layers.some(({ seriesType }) =>
    ['bar', 'bar_horizontal'].includes(seriesType)
  );

  const isAreaPercentage = state?.layers.some(
    ({ seriesType }) => seriesType === 'area_percentage_stacked'
  );

  const isHistogramSeries = Boolean(
    hasHistogramSeries(state?.layers as ValidLayer[], frame.datasourceLayers)
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

  const valueLabelsVisibilityMode = state?.valueLabels || 'hide';

  const isValueLabelsEnabled = !hasNonBarSeries && hasBarNotStacked && !isHistogramSeries;
  const isFittingEnabled = hasNonBarSeries;

  const valueLabelsDisabledReason = getValueLabelDisableReason({
    isAreaPercentage,
    isHistogramSeries,
  });

  return (
    <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none" responsive={false}>
          <TooltipWrapper
            tooltipContent={valueLabelsDisabledReason}
            condition={!isValueLabelsEnabled && !isFittingEnabled}
          >
            <ToolbarPopover
              title={i18n.translate('xpack.lens.xyChart.valuesLabel', {
                defaultMessage: 'Values',
              })}
              type="values"
              groupPosition="left"
              buttonDataTestSubj="lnsValuesButton"
              isDisabled={!isValueLabelsEnabled && !isFittingEnabled}
            >
              {isValueLabelsEnabled ? (
                <EuiFormRow
                  display="columnCompressed"
                  label={
                    <span>
                      {i18n.translate('xpack.lens.shared.chartValueLabelVisibilityLabel', {
                        defaultMessage: 'Labels',
                      })}
                    </span>
                  }
                >
                  <EuiButtonGroup
                    isFullWidth
                    legend={i18n.translate('xpack.lens.shared.chartValueLabelVisibilityLabel', {
                      defaultMessage: 'Labels',
                    })}
                    data-test-subj="lnsValueLabelsDisplay"
                    name="valueLabelsDisplay"
                    buttonSize="compressed"
                    options={valueLabelsOptions}
                    idSelected={
                      valueLabelsOptions.find(({ value }) => value === valueLabelsVisibilityMode)!
                        .id
                    }
                    onChange={(modeId) => {
                      const newMode = valueLabelsOptions.find(({ id }) => id === modeId)!.value;
                      setState({ ...state, valueLabels: newMode });
                    }}
                  />
                </EuiFormRow>
              ) : null}
              {isFittingEnabled ? (
                <EuiFormRow
                  display="columnCompressed"
                  label={
                    <>
                      {i18n.translate('xpack.lens.xyChart.missingValuesLabel', {
                        defaultMessage: 'Missing values',
                      })}{' '}
                      <EuiIconTip
                        color="subdued"
                        content={i18n.translate('xpack.lens.xyChart.missingValuesLabelHelpText', {
                          defaultMessage: `Gaps in the data are not shown by default, but can be represented as dotted lines with different modes.`,
                        })}
                        iconProps={{
                          className: 'eui-alignTop',
                        }}
                        position="top"
                        size="s"
                        type="questionInCircle"
                      />
                    </>
                  }
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
              ) : null}
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

export function DimensionEditor(
  props: VisualizationDimensionEditorProps<State> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, layerId, accessor } = props;
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index];
  const isHorizontal = isHorizontalChart(state.layers);
  const axisMode =
    (layer.yConfig &&
      layer.yConfig?.find((yAxisConfig) => yAxisConfig.forAccessor === accessor)?.axisMode) ||
    'auto';

  if (props.groupId === 'breakdown') {
    return (
      <>
        <PalettePicker
          palettes={props.frame.availablePalettes}
          activePalette={layer.palette}
          setPalette={(newPalette) => {
            setState(updateLayer(state, { ...layer, palette: newPalette }, index));
          }}
        />
      </>
    );
  }

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
          data-test-subj="lnsXY_axisSide_groups"
          name="axisSide"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}auto`,
              label: i18n.translate('xpack.lens.xyChart.axisSide.auto', {
                defaultMessage: 'Auto',
              }),
              'data-test-subj': 'lnsXY_axisSide_groups_auto',
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
              'data-test-subj': 'lnsXY_axisSide_groups_left',
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
  frame,
  formatFactory,
  paletteService,
}: VisualizationDimensionEditorProps<State> & {
  formatFactory: FormatFactory;
  paletteService: PaletteRegistry;
}) => {
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index];
  const disabled = !!layer.splitAccessor;

  const overwriteColor = getSeriesColor(layer, accessor);
  const currentColor = useMemo(() => {
    if (overwriteColor || !frame.activeData) return overwriteColor;

    const datasource = frame.datasourceLayers[layer.layerId];
    const sortedAccessors: string[] = getSortedAccessors(datasource, layer);

    const colorAssignments = getColorAssignments(
      state.layers,
      { tables: frame.activeData },
      formatFactory
    );
    const mappedAccessors = getAccessorColorConfig(
      colorAssignments,
      frame,
      {
        ...layer,
        accessors: sortedAccessors.filter((sorted) => layer.accessors.includes(sorted)),
      },
      paletteService
    );

    return mappedAccessors.find((a) => a.columnId === accessor)?.color || null;
  }, [overwriteColor, frame, paletteService, state.layers, accessor, formatFactory, layer]);

  const [color, setColor] = useState(currentColor);

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
      isClearable={Boolean(overwriteColor)}
      onChange={handleColor}
      color={disabled ? '' : color || currentColor}
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
