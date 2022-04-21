/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { Position, ScaleType, VerticalAlignment, HorizontalAlignment } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { VisualizationToolbarProps, FramePublicAPI } from '../../types';
import { State, XYState } from '../types';
import {
  AxesSettingsConfig,
  AxisExtentConfig,
} from '../../../../../../src/plugins/chart_expressions/expression_xy/common';
import { isHorizontalChart } from '../state_helpers';
import { LegendSettingsPopover } from '../../shared_components';
import { AxisSettingsPopover } from './axis_settings_popover';
import { getAxesConfiguration, GroupsConfiguration } from '../axes_configuration';
import { VisualOptionsPopover } from './visual_options_popover';
import { getScaleType } from '../to_expression';
import { TooltipWrapper } from '../../shared_components';
import { getDefaultVisualValuesForLayer } from '../../shared_components/datasource_default_values';
import { getDataLayers } from '../visualization_helpers';

type UnwrapArray<T> = T extends Array<infer P> ? P : T;
type AxesSettingsConfigKeys = keyof AxesSettingsConfig;

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

const legendOptions: Array<{
  id: string;
  value: 'auto' | 'show' | 'hide';
  label: string;
}> = [
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

const getDataBounds = function (
  activeData: FramePublicAPI['activeData'],
  axes: GroupsConfiguration
) {
  const groups: Partial<Record<string, { min: number; max: number }>> = {};
  axes.forEach((axis) => {
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    axis.series.forEach((series) => {
      activeData?.[series.layer]?.rows.forEach((row) => {
        const value = row[series.accessor];
        if (!Number.isNaN(value)) {
          if (value < min) {
            min = value;
          }
          if (value > max) {
            max = value;
          }
        }
      });
    });
    if (min !== Number.MAX_VALUE && max !== Number.MIN_VALUE) {
      groups[axis.groupId] = {
        min: Math.round((min + Number.EPSILON) * 100) / 100,
        max: Math.round((max + Number.EPSILON) * 100) / 100,
      };
    }
  });

  return groups;
};

function hasPercentageAxis(axisGroups: GroupsConfiguration, groupId: string, state: XYState) {
  return Boolean(
    axisGroups
      .find((group) => group.groupId === groupId)
      ?.series.some(({ layer: layerId }) =>
        getDataLayers(state?.layers).find(
          (layer) => layer.layerId === layerId && layer.seriesType.includes('percentage')
        )
      )
  );
}

export const XyToolbar = memo(function XyToolbar(
  props: VisualizationToolbarProps<State> & { useLegacyTimeAxis?: boolean }
) {
  const { state, setState, frame, useLegacyTimeAxis } = props;

  const dataLayers = getDataLayers(state?.layers);
  const shouldRotate = state?.layers.length ? isHorizontalChart(state.layers) : false;
  const axisGroups = getAxesConfiguration(dataLayers, shouldRotate, frame.activeData);
  const dataBounds = getDataBounds(frame.activeData, axisGroups);

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

  const labelsOrientation = {
    x: state?.labelsOrientation?.x ?? 0,
    yLeft: state?.labelsOrientation?.yLeft ?? 0,
    yRight: state?.labelsOrientation?.yRight ?? 0,
  };

  const onLabelsOrientationChange = (axis: AxesSettingsConfigKeys, orientation: number): void => {
    const newLabelsOrientation = {
      ...labelsOrientation,
      ...{
        [axis]: orientation,
      },
    };
    setState({
      ...state,
      labelsOrientation: newLabelsOrientation,
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

  const nonOrdinalXAxis = dataLayers.every(
    (layer) =>
      !layer.xAccessor ||
      getScaleType(
        props.frame.datasourceLayers[layer.layerId].getOperationForColumnId(layer.xAccessor),
        ScaleType.Linear
      ) !== 'ordinal'
  );

  // only allow changing endzone visibility if it could show up theoretically (if it's a time viz)
  const onChangeEndzoneVisiblity = dataLayers.every(
    (layer) =>
      layer.xAccessor &&
      getScaleType(
        props.frame.datasourceLayers[layer.layerId].getOperationForColumnId(layer.xAccessor),
        ScaleType.Linear
      ) === 'time'
  )
    ? (checked: boolean): void => {
        setState({
          ...state,
          hideEndzones: !checked,
        });
      }
    : undefined;

  const legendMode =
    state?.legend.isVisible && !state?.legend.showSingleSeries
      ? 'auto'
      : !state?.legend.isVisible
      ? 'hide'
      : 'show';
  const hasBarOrAreaOnLeftAxis = Boolean(
    axisGroups
      .find((group) => group.groupId === 'left')
      ?.series?.some((series) => {
        const seriesType = dataLayers.find((l) => l.layerId === series.layer)?.seriesType;
        return seriesType?.includes('bar') || seriesType?.includes('area');
      })
  );
  const setLeftExtent = useCallback(
    (extent: AxisExtentConfig | undefined) => {
      setState({
        ...state,
        yLeftExtent: extent,
      });
    },
    [setState, state]
  );
  const hasBarOrAreaOnRightAxis = Boolean(
    axisGroups
      .find((group) => group.groupId === 'right')
      ?.series?.some((series) => {
        const seriesType = dataLayers.find((l) => l.layerId === series.layer)?.seriesType;
        return seriesType?.includes('bar') || seriesType?.includes('area');
      })
  );
  const setRightExtent = useCallback(
    (extent: AxisExtentConfig | undefined) => {
      setState({
        ...state,
        yRightExtent: extent,
      });
    },
    [setState, state]
  );

  const filteredBarLayers = dataLayers.filter((layer) => layer.seriesType.includes('bar'));
  const chartHasMoreThanOneBarSeries =
    filteredBarLayers.length > 1 ||
    filteredBarLayers.some((layer) => layer.accessors.length > 1 || layer.splitAccessor);

  const isTimeHistogramModeEnabled = dataLayers.some(
    ({ xAccessor, layerId, seriesType, splitAccessor }) => {
      if (!xAccessor) {
        return false;
      }
      const xAccessorOp = props.frame.datasourceLayers[layerId].getOperationForColumnId(xAccessor);
      return (
        getScaleType(xAccessorOp, ScaleType.Linear) === ScaleType.Time &&
        xAccessorOp?.isBucketed &&
        (seriesType.includes('stacked') || !splitAccessor) &&
        (seriesType.includes('stacked') ||
          !seriesType.includes('bar') ||
          !chartHasMoreThanOneBarSeries)
      );
    }
  );

  // Ask the datasource if it has a say about default truncation value
  const defaultParamsFromDatasources = getDefaultVisualValuesForLayer(
    state,
    props.frame.datasourceLayers
  ).truncateText;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
          <VisualOptionsPopover
            state={state}
            setState={setState}
            datasourceLayers={frame.datasourceLayers}
          />

          <LegendSettingsPopover
            legendOptions={legendOptions}
            mode={legendMode}
            location={state?.legend.isInside ? 'inside' : 'outside'}
            onLocationChange={(location) => {
              setState({
                ...state,
                legend: {
                  ...state.legend,
                  isInside: location === 'inside',
                },
              });
            }}
            onDisplayChange={(optionId) => {
              const newMode = legendOptions.find(({ id }) => id === optionId)!.value;
              if (newMode === 'auto') {
                setState({
                  ...state,
                  legend: {
                    ...state.legend,
                    isVisible: true,
                    showSingleSeries: false,
                  },
                });
              } else if (newMode === 'show') {
                setState({
                  ...state,
                  legend: {
                    ...state.legend,
                    isVisible: true,
                    showSingleSeries: true,
                  },
                });
              } else if (newMode === 'hide') {
                setState({
                  ...state,
                  legend: {
                    ...state.legend,
                    isVisible: false,
                    showSingleSeries: false,
                  },
                });
              }
            }}
            position={state?.legend.position}
            horizontalAlignment={state?.legend.horizontalAlignment}
            verticalAlignment={state?.legend.verticalAlignment}
            floatingColumns={state?.legend.floatingColumns}
            onFloatingColumnsChange={(val) => {
              setState({
                ...state,
                legend: { ...state.legend, floatingColumns: val },
              });
            }}
            maxLines={state?.legend.maxLines}
            onMaxLinesChange={(val) => {
              setState({
                ...state,
                legend: { ...state.legend, maxLines: val },
              });
            }}
            shouldTruncate={state?.legend.shouldTruncate ?? defaultParamsFromDatasources}
            onTruncateLegendChange={() => {
              const current = state?.legend.shouldTruncate ?? defaultParamsFromDatasources;
              setState({
                ...state,
                legend: { ...state.legend, shouldTruncate: !current },
              });
            }}
            onPositionChange={(id) => {
              setState({
                ...state,
                legend: { ...state.legend, position: id as Position },
              });
            }}
            onAlignmentChange={(value) => {
              const [vertical, horizontal] = value.split('_');
              const verticalAlignment = vertical as VerticalAlignment;
              const horizontalAlignment = horizontal as HorizontalAlignment;
              setState({
                ...state,
                legend: { ...state.legend, verticalAlignment, horizontalAlignment },
              });
            }}
            renderValueInLegendSwitch={nonOrdinalXAxis}
            valueInLegend={state?.valuesInLegend}
            onValueInLegendChange={() => {
              setState({
                ...state,
                valuesInLegend: !state.valuesInLegend,
              });
            }}
            legendSize={state.legend.legendSize}
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
              orientation={labelsOrientation.yLeft}
              setOrientation={onLabelsOrientationChange}
              isAxisTitleVisible={axisTitlesVisibilitySettings.yLeft}
              toggleAxisTitleVisibility={onAxisTitlesVisibilitySettingsChange}
              extent={state?.yLeftExtent || { mode: 'full' }}
              setExtent={setLeftExtent}
              hasBarOrAreaOnAxis={hasBarOrAreaOnLeftAxis}
              dataBounds={dataBounds.left}
              hasPercentageAxis={hasPercentageAxis(axisGroups, 'left', state)}
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
            orientation={labelsOrientation.x}
            setOrientation={onLabelsOrientationChange}
            isAxisTitleVisible={axisTitlesVisibilitySettings.x}
            toggleAxisTitleVisibility={onAxisTitlesVisibilitySettingsChange}
            endzonesVisible={!state?.hideEndzones}
            setEndzoneVisibility={onChangeEndzoneVisiblity}
            hasBarOrAreaOnAxis={false}
            hasPercentageAxis={false}
            useMultilayerTimeAxis={
              isTimeHistogramModeEnabled && !useLegacyTimeAxis && !shouldRotate
            }
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
              orientation={labelsOrientation.yRight}
              setOrientation={onLabelsOrientationChange}
              hasPercentageAxis={hasPercentageAxis(axisGroups, 'right', state)}
              isAxisTitleVisible={axisTitlesVisibilitySettings.yRight}
              toggleAxisTitleVisibility={onAxisTitlesVisibilitySettingsChange}
              extent={state?.yRightExtent || { mode: 'full' }}
              setExtent={setRightExtent}
              hasBarOrAreaOnAxis={hasBarOrAreaOnRightAxis}
              dataBounds={dataBounds.right}
            />
          </TooltipWrapper>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
