/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, IconType } from '@elastic/eui';
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { EuiIconAxisLeft, EuiIconAxisBottom } from '@kbn/chart-icons';
import type { VisualizationToolbarProps } from '../../types';
import {
  LegendSettingsPopover,
  ToolbarPopover,
  ValueLabelsSettings,
  AxisTitleSettings,
  TooltipWrapper,
} from '../../shared_components';
import type { HeatmapVisualizationState } from './types';
import { getDefaultVisualValuesForLayer } from '../../shared_components/datasource_default_values';
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

    const legendSize = state?.legend.legendSize;

    const [hadAutoLegendSize] = useState(() => legendSize === LegendSize.AUTO);

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
                valueLabels={state?.gridConfig.isCellLabelVisible ? 'show' : 'hide'}
                onValueLabelChange={(newMode) => {
                  setState({
                    ...state,
                    gridConfig: { ...state.gridConfig, isCellLabelVisible: newMode === 'show' },
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
              legendSize={legendSize}
              onLegendSizeChange={(newLegendSize) => {
                setState({
                  ...state,
                  legend: {
                    ...state.legend,
                    legendSize: newLegendSize,
                  },
                });
              }}
              showAutoLegendSizeOption={hadAutoLegendSize}
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
                  updateTitleState={({ title, visible }) => {
                    setState({
                      ...state,
                      gridConfig: {
                        ...state.gridConfig,
                        yTitle: title,
                        isYAxisTitleVisible: visible,
                      },
                    });
                  }}
                  isAxisTitleVisible={state?.gridConfig.isYAxisTitleVisible}
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
                  updateTitleState={({ title, visible }) =>
                    setState({
                      ...state,
                      gridConfig: {
                        ...state.gridConfig,
                        xTitle: title,
                        isXAxisTitleVisible: visible,
                      },
                    })
                  }
                  isAxisTitleVisible={state?.gridConfig.isXAxisTitleVisible}
                />
              </ToolbarPopover>
            </TooltipWrapper>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
