/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, IconType } from '@elastic/eui';
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { VisualizationToolbarProps } from '../types';
import {
  LegendSettingsPopover,
  ToolbarPopover,
  ValueLabelsSettings,
  AxisTitleSettings,
  TooltipWrapper,
} from '../shared_components';
import { EuiIconAxisLeft } from '../assets/axis_left';
import { EuiIconAxisBottom } from '../assets/axis_bottom';
import type { HeatmapVisualizationState } from './types';
import { getDefaultVisualValuesForLayer } from '../shared_components/datasource_default_values';
import './toolbar_component.scss';

const legendOptions: Array<{ id: string; value: 'auto' | 'show' | 'hide'; label: string }> = [
  {
    id: `heatmap_legend_show`,
    value: 'show',
    label: i18n.translate('xpack.lens.heatmapChart.legendVisibility.show', {
      defaultMessage: 'Show',
    }),
  },
  {
    id: `heatmap_legend_hide`,
    value: 'hide',
    label: i18n.translate('xpack.lens.heatmapChart.legendVisibility.hide', {
      defaultMessage: 'Hide',
    }),
  },
];

export const HeatmapToolbar = memo(
  (props: VisualizationToolbarProps<HeatmapVisualizationState>) => {
    const { state, setState, frame } = props;

    const legendMode = state.legend.isVisible ? 'show' : 'hide';
    const defaultTruncationValue = getDefaultVisualValuesForLayer(
      state,
      frame.datasourceLayers
    ).truncateText;
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
            <ToolbarPopover
              title={i18n.translate('xpack.lens.shared.curveLabel', {
                defaultMessage: 'Visual options',
              })}
              type="visualOptions"
              groupPosition="left"
              buttonDataTestSubj="lnsVisualOptionsButton"
            >
              <ValueLabelsSettings
                valueLabels={state?.gridConfig.isCellLabelVisible ? 'inside' : 'hide'}
                onValueLabelChange={(newMode) => {
                  setState({
                    ...state,
                    gridConfig: { ...state.gridConfig, isCellLabelVisible: newMode === 'inside' },
                  });
                }}
              />
            </ToolbarPopover>

            <LegendSettingsPopover
              groupPosition={'right'}
              legendOptions={legendOptions}
              mode={legendMode}
              onDisplayChange={(optionId) => {
                const newMode = legendOptions.find(({ id }) => id === optionId)!.value;
                if (newMode === 'show') {
                  setState({
                    ...state,
                    legend: { ...state.legend, isVisible: true },
                  });
                } else if (newMode === 'hide') {
                  setState({
                    ...state,
                    legend: { ...state.legend, isVisible: false },
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
              maxLines={state?.legend.maxLines}
              onMaxLinesChange={(val) => {
                setState({
                  ...state,
                  legend: { ...state.legend, maxLines: val },
                });
              }}
              shouldTruncate={state?.legend.shouldTruncate ?? defaultTruncationValue}
              onTruncateLegendChange={() => {
                const current = state.legend.shouldTruncate ?? defaultTruncationValue;
                setState({
                  ...state,
                  legend: { ...state.legend, shouldTruncate: !current },
                });
              }}
              legendSize={state?.legend.legendSize}
              onLegendSizeChange={(legendSize) => {
                setState({
                  ...state,
                  legend: {
                    ...state.legend,
                    legendSize,
                  },
                });
              }}
            />
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
            <TooltipWrapper
              tooltipContent={i18n.translate('xpack.lens.heatmap.verticalAxisDisabledHelpText', {
                defaultMessage: 'This setting only applies when vertical axis is enabled.',
              })}
              condition={!Boolean(state?.yAccessor)}
            >
              <ToolbarPopover
                title={i18n.translate('xpack.lens.heatmap.verticalAxisLabel', {
                  defaultMessage: 'Vertical axis',
                })}
                type={EuiIconAxisLeft as IconType}
                groupPosition="left"
                isDisabled={!Boolean(state?.yAccessor)}
                buttonDataTestSubj="lnsHeatmapVerticalAxisButton"
                panelClassName="lnsVisToolbarAxis__popover"
              >
                <AxisTitleSettings
                  axis="yLeft"
                  axisTitle={state?.gridConfig.yTitle}
                  updateTitleState={(value) =>
                    setState({
                      ...state,
                      gridConfig: { ...state.gridConfig, yTitle: value },
                    })
                  }
                  isAxisTitleVisible={state?.gridConfig.isYAxisTitleVisible}
                  toggleAxisTitleVisibility={(_, checked) =>
                    setState({
                      ...state,
                      gridConfig: { ...state.gridConfig, isYAxisTitleVisible: checked },
                    })
                  }
                />
              </ToolbarPopover>
            </TooltipWrapper>

            <TooltipWrapper
              tooltipContent={i18n.translate('xpack.lens.heatmap.horizontalAxisDisabledHelpText', {
                defaultMessage: 'This setting only applies when horizontal axis is enabled.',
              })}
              condition={!Boolean(state?.xAccessor)}
            >
              <ToolbarPopover
                title={i18n.translate('xpack.lens.heatmap.horizontalAxisLabel', {
                  defaultMessage: 'Horizontal axis',
                })}
                type={EuiIconAxisBottom as IconType}
                groupPosition="center"
                isDisabled={!Boolean(state?.xAccessor)}
                buttonDataTestSubj="lnsHeatmapHorizontalAxisButton"
              >
                <AxisTitleSettings
                  axis="x"
                  axisTitle={state?.gridConfig.xTitle}
                  updateTitleState={(value) =>
                    setState({
                      ...state,
                      gridConfig: { ...state.gridConfig, xTitle: value },
                    })
                  }
                  isAxisTitleVisible={state?.gridConfig.isXAxisTitleVisible}
                  toggleAxisTitleVisibility={(_, checked) =>
                    setState({
                      ...state,
                      gridConfig: { ...state.gridConfig, isXAxisTitleVisible: checked },
                    })
                  }
                />
              </ToolbarPopover>
            </TooltipWrapper>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
