/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './xy_config_panel.scss';
import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { Position } from '@elastic/charts';
import { debounce } from 'lodash';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiFormRow,
  EuiPopover,
  EuiText,
  EuiSelect,
  htmlIdGenerator,
  EuiForm,
  EuiColorPicker,
  EuiColorPickerProps,
  EuiToolTip,
  EuiIcon,
  EuiFieldText,
  EuiSwitch,
  EuiHorizontalRule,
  EuiTitle,
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
import { ToolbarButton } from '../toolbar_button';

type UnwrapArray<T> = T extends Array<infer P> ? P : T;

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
      defaultMessage: 'auto',
    }),
  },
  {
    id: `xy_legend_show`,
    value: 'show',
    label: i18n.translate('xpack.lens.xyChart.legendVisibility.show', {
      defaultMessage: 'show',
    }),
  },
  {
    id: `xy_legend_hide`,
    value: 'hide',
    label: i18n.translate('xpack.lens.xyChart.legendVisibility.hide', {
      defaultMessage: 'hide',
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
  const axes = [
    {
      id: 'x',
      label: 'X-axis',
    },
    {
      id: 'y',
      label: 'Y-axis',
    },
  ];

  const { frame, state, setState } = props;

  const [open, setOpen] = useState(false);
  const hasNonBarSeries = state?.layers.some(({ seriesType }) =>
    ['area_stacked', 'area', 'line'].includes(seriesType)
  );

  const [xAxisTitle, setXAxisTitle] = useState(state?.xTitle);
  const [yAxisTitle, setYAxisTitle] = useState(state?.yTitle);

  const xyTitles = useCallback(() => {
    const defaults = {
      xTitle: xAxisTitle,
      yTitle: yAxisTitle,
    };
    const layer = state?.layers[0];
    if (!layer || !layer.accessors.length) {
      return defaults;
    }
    const datasource = frame.datasourceLayers[layer.layerId];
    if (!datasource) {
      return defaults;
    }
    const x = layer.xAccessor ? datasource.getOperationForColumnId(layer.xAccessor) : null;
    const y = layer.accessors[0] ? datasource.getOperationForColumnId(layer.accessors[0]) : null;

    return {
      xTitle: defaults.xTitle || x?.label,
      yTitle: defaults.yTitle || y?.label,
    };
    /* We want this callback to run only if open changes its state. What we want to accomplish here is to give the user a better UX.
       By default these input fields have the axis legends. If the user changes the input text, the axis legends should also change.
       BUT if the user cleans up the input text, it should remain empty until the user closes and reopens the panel.
       In that case, the default axes legend should appear. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const {
      xTitle,
      yTitle,
    }: { xTitle: string | undefined; yTitle: string | undefined } = xyTitles();
    setXAxisTitle(xTitle);
    setYAxisTitle(yTitle);
  }, [xyTitles]);

  const onXTitleChange = (value: string): void => {
    setXAxisTitle(value);
    setState({ ...state, xTitle: value });
  };

  const onYTitleChange = (value: string): void => {
    setYAxisTitle(value);
    setState({ ...state, yTitle: value });
  };

  type AxesSettingsConfigKeys = keyof AxesSettingsConfig;

  const tickLabelsVisibilitySettings = {
    x: state?.tickLabelsVisibilitySettings?.x ?? true,
    y: state?.tickLabelsVisibilitySettings?.y ?? true,
  };

  const onTickLabelsVisibilitySettingsChange = (optionId: string): void => {
    const id = optionId as AxesSettingsConfigKeys;
    const newTickLabelsVisibilitySettings = {
      ...tickLabelsVisibilitySettings,
      ...{
        [id]: !tickLabelsVisibilitySettings[id],
      },
    };
    setState({
      ...state,
      tickLabelsVisibilitySettings: newTickLabelsVisibilitySettings,
    });
  };

  const gridlinesVisibilitySettings = {
    x: state?.gridlinesVisibilitySettings?.x ?? true,
    y: state?.gridlinesVisibilitySettings?.y ?? true,
  };

  const onGridlinesVisibilitySettingsChange = (optionId: string): void => {
    const id = optionId as AxesSettingsConfigKeys;
    const newGridlinesVisibilitySettings = {
      ...gridlinesVisibilitySettings,
      ...{
        [id]: !gridlinesVisibilitySettings[id],
      },
    };
    setState({
      ...state,
      gridlinesVisibilitySettings: newGridlinesVisibilitySettings,
    });
  };

  const legendMode =
    state?.legend.isVisible && !state?.legend.showSingleSeries
      ? 'auto'
      : !state?.legend.isVisible
      ? 'hide'
      : 'show';
  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiPopover
          panelClassName="lnsXyToolbar__popover"
          ownFocus
          button={
            <ToolbarButton
              fontWeight="normal"
              onClick={() => {
                setOpen(!open);
              }}
            >
              {i18n.translate('xpack.lens.xyChart.settingsLabel', { defaultMessage: 'Settings' })}
            </ToolbarButton>
          }
          isOpen={open}
          closePopover={() => {
            setOpen(false);
          }}
          anchorPosition="downRight"
        >
          <EuiToolTip
            anchorClassName="eui-displayBlock"
            content={
              !hasNonBarSeries &&
              i18n.translate('xpack.lens.xyChart.fittingDisabledHelpText', {
                defaultMessage: 'This setting only applies to line and area charts.',
              })
            }
          >
            <EuiFormRow
              display="columnCompressed"
              label={i18n.translate('xpack.lens.xyChart.fittingLabel', {
                defaultMessage: 'Fill missing values',
              })}
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
                valueOfSelected={state?.fittingFunction || 'None'}
                onChange={(value) => setState({ ...state, fittingFunction: value })}
                itemLayoutAlign="top"
                hasDividers
              />
            </EuiFormRow>
          </EuiToolTip>
          <EuiHorizontalRule margin="s" />
          <EuiFormRow
            display="columnCompressed"
            label={i18n.translate('xpack.lens.xyChart.legendVisibilityLabel', {
              defaultMessage: 'Legend display',
            })}
          >
            <EuiButtonGroup
              isFullWidth
              legend={i18n.translate('xpack.lens.xyChart.legendVisibilityLabel', {
                defaultMessage: 'Legend display',
              })}
              name="legendDisplay"
              buttonSize="compressed"
              options={legendOptions}
              idSelected={legendOptions.find(({ value }) => value === legendMode)!.id}
              onChange={(optionId) => {
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
            />
          </EuiFormRow>
          <EuiFormRow
            display="columnCompressed"
            label={i18n.translate('xpack.lens.xyChart.legendPositionLabel', {
              defaultMessage: 'Legend position',
            })}
          >
            <EuiSelect
              disabled={legendMode === 'hide'}
              compressed
              options={[
                { value: Position.Top, text: 'Top' },
                { value: Position.Left, text: 'Left' },
                { value: Position.Right, text: 'Right' },
                { value: Position.Bottom, text: 'Bottom' },
              ]}
              value={state?.legend.position}
              onChange={(e) => {
                setState({
                  ...state,
                  legend: { ...state.legend, position: e.target.value as Position },
                });
              }}
            />
          </EuiFormRow>
          <EuiHorizontalRule margin="s" />
          <EuiFormRow
            display="columnCompressed"
            label={i18n.translate('xpack.lens.xyChart.TickLabels', {
              defaultMessage: 'Tick Labels',
            })}
          >
            <EuiButtonGroup
              name="lnsTickLabels"
              data-test-subj="lnsTickLabelsSettings"
              legend="Group of Tick Labels Visibility Settings"
              options={axes}
              idToSelectedMap={tickLabelsVisibilitySettings}
              onChange={(id) => onTickLabelsVisibilitySettingsChange(id)}
              buttonSize="compressed"
              isFullWidth
              type="multi"
            />
          </EuiFormRow>
          <EuiFormRow
            display="columnCompressed"
            label={i18n.translate('xpack.lens.xyChart.Gridlines', {
              defaultMessage: 'Gridlines',
            })}
          >
            <EuiButtonGroup
              name="lnsGridlines"
              data-test-subj="lnsGridlinesSettings"
              legend="Group of Gridlines Visibility Settings"
              options={axes}
              idToSelectedMap={gridlinesVisibilitySettings}
              onChange={(id) => onGridlinesVisibilitySettingsChange(id)}
              buttonSize="compressed"
              isFullWidth
              type="multi"
            />
          </EuiFormRow>
          <EuiHorizontalRule margin="s" />
          <EuiTitle size="xxs">
            <span>
              {i18n.translate('xpack.lens.xyChart.axisTitles', { defaultMessage: 'Axis titles' })}
            </span>
          </EuiTitle>
          <EuiFormRow
            display="columnCompressed"
            label={
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>X-axis</EuiFlexItem>
                <EuiFlexItem>
                  <EuiSwitch
                    compressed
                    data-test-subj="lnsshowXAxisTitleSwitch"
                    showLabel={false}
                    label={i18n.translate('xpack.lens.xyChart.showXAxisTitleLabel', {
                      defaultMessage: 'show X-axis Title',
                    })}
                    onChange={({ target }) =>
                      setState({ ...state, showXAxisTitle: target.checked })
                    }
                    checked={state?.showXAxisTitle ?? true}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiFieldText
              data-test-subj="lnsXAxisTitle"
              compressed
              placeholder={i18n.translate('xpack.lens.xyChart.overwriteXaxis', {
                defaultMessage: 'Overwrite X-axis title',
              })}
              value={xAxisTitle || ''}
              disabled={state && 'showXAxisTitle' in state ? !state.showXAxisTitle : false}
              onChange={({ target }) => onXTitleChange(target.value)}
              aria-label={i18n.translate('xpack.lens.xyChart.overwriteXaxis', {
                defaultMessage: 'Overwrite X-axis title',
              })}
            />
          </EuiFormRow>
          <EuiFormRow
            display="columnCompressed"
            label={
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>Y-axis</EuiFlexItem>
                <EuiFlexItem>
                  <EuiSwitch
                    compressed
                    data-test-subj="lnsShowYAxisTitleSwitch"
                    showLabel={false}
                    label={i18n.translate('xpack.lens.xyChart.ShowYAxisTitleLabel', {
                      defaultMessage: 'Show Y-axis Title',
                    })}
                    onChange={({ target }) =>
                      setState({ ...state, showYAxisTitle: target.checked })
                    }
                    checked={state?.showYAxisTitle ?? true}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiFieldText
              data-test-subj="lnsYAxisTitle"
              compressed
              placeholder={i18n.translate('xpack.lens.xyChart.overwriteYaxis', {
                defaultMessage: 'Overwrite Y-axis title',
              })}
              value={yAxisTitle || ''}
              disabled={state && 'showYAxisTitle' in state ? !state.showYAxisTitle : false}
              onChange={({ target }) => onYTitleChange(target.value)}
              aria-label={i18n.translate('xpack.lens.xyChart.overwriteYaxis', {
                defaultMessage: 'Overwrite Y-axis title',
              })}
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
