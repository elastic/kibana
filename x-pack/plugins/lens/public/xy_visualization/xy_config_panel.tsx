/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './xy_config_panel.scss';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import {
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

  const [open, setOpen] = useState(false);
  const hasNonBarSeries = props.state?.layers.some(
    (layer) => layer.seriesType === 'line' || layer.seriesType === 'area'
  );
  const [xtitle, setXtitle] = useState<string>(props.state?.xTitle || '');
  const [ytitle, setYtitle] = useState<string>(props.state?.yTitle || '');
  const [tickLabelsVisibilitySettings, setTickLabelsVisibilitySettings] = useState<
    AxesSettingsConfig
  >({
    ['x']: props.state?.tickLabelsVisibilitySettings
      ? props.state.tickLabelsVisibilitySettings.x
      : true,
    ['y']: props.state?.tickLabelsVisibilitySettings
      ? props.state.tickLabelsVisibilitySettings.y
      : true,
  });
  const [gridlinesVisibilitySettings, setGridlinesVisibilitySettings] = useState<
    AxesSettingsConfig
  >({
    ['x']: props.state?.gridlinesVisibilitySettings?.x,
    ['y']: props.state?.gridlinesVisibilitySettings?.y,
  });

  const onXTitleChange = (value: string): void => {
    setXtitle(value);
    props.setState({ ...props.state, xTitle: value });
  };

  const onYTitleChange = (value: string): void => {
    setYtitle(value);
    props.setState({ ...props.state, yTitle: value });
  };

  const onTickLabelsVisibilitySettingsChange = (optionId) => {
    const newTickLabelsVisibilitySettings = {
      ...tickLabelsVisibilitySettings,
      ...{
        [optionId]: !tickLabelsVisibilitySettings[optionId],
      },
    };
    setTickLabelsVisibilitySettings(newTickLabelsVisibilitySettings);
    props.setState({
      ...props.state,
      tickLabelsVisibilitySettings: newTickLabelsVisibilitySettings,
    });
  };

  const onGridlinesVisibilitySettingsChange = (optionId) => {
    const newGridlinesVisibilitySettings = {
      ...gridlinesVisibilitySettings,
      ...{
        [optionId]: !gridlinesVisibilitySettings[optionId],
      },
    };
    setGridlinesVisibilitySettings(newGridlinesVisibilitySettings);
    props.setState({
      ...props.state,
      gridlinesVisibilitySettings: newGridlinesVisibilitySettings,
    });
  };

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
                defaultMessage:
                  'This setting only applies to line charts and unstacked area charts.',
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
                valueOfSelected={props.state?.fittingFunction || 'None'}
                onChange={(value) => props.setState({ ...props.state, fittingFunction: value })}
                itemLayoutAlign="top"
                hasDividers
              />
            </EuiFormRow>
          </EuiToolTip>
          <EuiHorizontalRule margin="s" />
          <EuiFormRow
            display="columnCompressed"
            label={i18n.translate('xpack.lens.xyChart.TickLabels', {
              defaultMessage: 'Tick Labels',
            })}
          >
            <EuiButtonGroup
              name="lnsTickLabels"
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
              name="lndGridlines"
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
            <span>Axis Titles</span>
          </EuiTitle>
          <EuiFormRow
            display="columnCompressed"
            label={
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>X-axis</EuiFlexItem>
                <EuiFlexItem>
                  <EuiSwitch
                    data-test-subj="lnsshowXAxisTitleSwitch"
                    showLabel={false}
                    label={i18n.translate('xpack.lens.xyChart.showXAxisTitleLabel', {
                      defaultMessage: 'show X-axis Title',
                    })}
                    onChange={({ target }) =>
                      props.setState({ ...props.state, showXAxisTitle: target.checked })
                    }
                    checked={props.state?.showXAxisTitle ?? true}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiFieldText
              data-test-subj="lnsXAxisTitle"
              compressed
              placeholder="Overwrite X-axis title"
              value={xtitle}
              disabled={
                props.state && 'showXAxisTitle' in props.state ? !props.state.showXAxisTitle : false
              }
              onChange={({ target }) => onXTitleChange(target.value)}
              aria-label="Overwrite X-axis title"
            />
          </EuiFormRow>
          <EuiFormRow
            display="columnCompressed"
            label={
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>Y-axis</EuiFlexItem>
                <EuiFlexItem>
                  <EuiSwitch
                    data-test-subj="lnsShowYAxisTitleSwitch"
                    showLabel={false}
                    label={i18n.translate('xpack.lens.xyChart.ShowYAxisTitleLabel', {
                      defaultMessage: 'Show Y-axis Title',
                    })}
                    onChange={({ target }) =>
                      props.setState({ ...props.state, showYAxisTitle: target.checked })
                    }
                    checked={props.state?.showYAxisTitle ?? true}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiFieldText
              data-test-subj="lnsYAxisTitle"
              compressed
              placeholder="Overwrite Y-axis title"
              value={ytitle}
              disabled={
                props.state && 'showYAxisTitle' in props.state ? !props.state.showYAxisTitle : false
              }
              onChange={({ target }) => onYTitleChange(target.value)}
              aria-label="Overwrite Y-axis title"
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
    [state, layer, accessor, index]
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
