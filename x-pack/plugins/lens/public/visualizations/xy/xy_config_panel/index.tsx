/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Position, ScaleType } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AxisExtentConfig } from '@kbn/expression-xy-plugin/common';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import type { LegendSettingsPopoverProps } from '../../../shared_components/legend/legend_settings_popover';
import type { VisualizationToolbarProps, FramePublicAPI } from '../../../types';
import { State, XYState, AxesSettingsConfig } from '../types';
import { isHorizontalChart } from '../state_helpers';
import { hasNumericHistogramDimension, LegendSettingsPopover } from '../../../shared_components';
import { AxisSettingsPopover } from './axis_settings_popover';
import { getAxesConfiguration, getXDomain, GroupsConfiguration } from '../axes_configuration';
import { VisualOptionsPopover } from './visual_options_popover';
import { getScaleType } from '../to_expression';
import { TooltipWrapper } from '../../../shared_components';
import { getDefaultVisualValuesForLayer } from '../../../shared_components/datasource_default_values';
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

const axisKeyToTitleMapping: Record<keyof AxesSettingsConfig, 'xTitle' | 'yTitle' | 'yRightTitle'> =
  {
    x: 'xTitle',
    yLeft: 'yTitle',
    yRight: 'yRightTitle',
  };

export const XyToolbar = memo(function XyToolbar(
  props: VisualizationToolbarProps<State> & { useLegacyTimeAxis?: boolean }
) {
  const { state, setState, frame, useLegacyTimeAxis } = props;

  const dataLayers = getDataLayers(state?.layers);
  const shouldRotate = state?.layers.length ? isHorizontalChart(state.layers) : false;
  const axisGroups = getAxesConfiguration(dataLayers, shouldRotate, frame.activeData);
  const dataBounds = getDataBounds(frame.activeData, axisGroups);
  const xDataBounds = getXDomain(dataLayers, frame.activeData);

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

  const axisTitlesVisibilitySettings = useMemo(
    () => ({
      x: state?.axisTitlesVisibilitySettings?.x ?? true,
      yLeft: state?.axisTitlesVisibilitySettings?.yLeft ?? true,
      yRight: state?.axisTitlesVisibilitySettings?.yRight ?? true,
    }),
    [
      state?.axisTitlesVisibilitySettings?.x,
      state?.axisTitlesVisibilitySettings?.yLeft,
      state?.axisTitlesVisibilitySettings?.yRight,
    ]
  );

  const onTitleStateChange = useCallback(
    ({ title, visible }: { title?: string; visible: boolean }, axis: keyof AxesSettingsConfig) =>
      setState({
        ...state,
        [axisKeyToTitleMapping[axis]]: title,
        axisTitlesVisibilitySettings: { ...axisTitlesVisibilitySettings, [axis]: visible },
      }),
    [axisTitlesVisibilitySettings, setState, state]
  );
  const nonOrdinalXAxis = dataLayers.every(
    (layer) =>
      !layer.xAccessor ||
      getScaleType(
        props.frame.datasourceLayers[layer.layerId]?.getOperationForColumnId(layer.xAccessor) ??
          null,
        ScaleType.Linear
      ) !== 'ordinal'
  );

  const isTimeVis = dataLayers.every(
    (layer) =>
      layer.xAccessor &&
      getScaleType(
        props.frame.datasourceLayers[layer.layerId]?.getOperationForColumnId(layer.xAccessor) ??
          null,
        ScaleType.Linear
      ) === ScaleType.Time
  );

  // only allow changing endzone visibility if it could show up theoretically (if it's a time viz)
  const onChangeEndzoneVisiblity = isTimeVis
    ? (checked: boolean): void => {
        setState({
          ...state,
          hideEndzones: !checked,
        });
      }
    : undefined;

  const onChangeCurrentTimeMarkerVisibility = isTimeVis
    ? (checked: boolean): void => {
        setState({
          ...state,
          showCurrentTimeMarker: checked,
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
  const setXExtent = useCallback(
    (extent: AxisExtentConfig | undefined) => {
      setState({
        ...state,
        xExtent: extent,
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
      const xAccessorOp =
        props.frame.datasourceLayers[layerId]?.getOperationForColumnId(xAccessor) ?? null;
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

  const hasNumberHistogram = dataLayers.some(({ layerId, xAccessor }) =>
    hasNumericHistogramDimension(props.frame.datasourceLayers[layerId], xAccessor)
  );

  // Ask the datasource if it has a say about default truncation value
  const defaultParamsFromDatasources = getDefaultVisualValuesForLayer(
    state,
    props.frame.datasourceLayers
  ).truncateText;

  const legendSize = state.legend.legendSize;

  const [hadAutoLegendSize] = useState(() => legendSize === LegendSize.AUTO);

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
              const verticalAlignment = vertical as LegendSettingsPopoverProps['verticalAlignment'];
              const horizontalAlignment =
                horizontal as LegendSettingsPopoverProps['horizontalAlignment'];

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
              updateTitleState={onTitleStateChange}
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
              extent={state?.yLeftExtent || { mode: 'full' }}
              setExtent={setLeftExtent}
              hasBarOrAreaOnAxis={hasBarOrAreaOnLeftAxis}
              dataBounds={dataBounds.left}
              hasPercentageAxis={hasPercentageAxis(axisGroups, 'left', state)}
              scale={state?.yLeftScale}
              setScale={(scale) => {
                setState({
                  ...state,
                  yLeftScale: scale,
                });
              }}
            />
          </TooltipWrapper>

          <AxisSettingsPopover
            axis="x"
            layers={state?.layers}
            axisTitle={state?.xTitle}
            updateTitleState={onTitleStateChange}
            areTickLabelsVisible={tickLabelsVisibilitySettings.x}
            toggleTickLabelsVisibility={onTickLabelsVisibilitySettingsChange}
            areGridlinesVisible={gridlinesVisibilitySettings.x}
            toggleGridlinesVisibility={onGridlinesVisibilitySettingsChange}
            orientation={labelsOrientation.x}
            setOrientation={onLabelsOrientationChange}
            isAxisTitleVisible={axisTitlesVisibilitySettings.x}
            endzonesVisible={!state?.hideEndzones}
            setEndzoneVisibility={onChangeEndzoneVisiblity}
            currentTimeMarkerVisible={state?.showCurrentTimeMarker}
            setCurrentTimeMarkerVisibility={onChangeCurrentTimeMarkerVisibility}
            hasBarOrAreaOnAxis={false}
            hasPercentageAxis={false}
            useMultilayerTimeAxis={
              isTimeHistogramModeEnabled && !useLegacyTimeAxis && !shouldRotate
            }
            extent={hasNumberHistogram ? state?.xExtent || { mode: 'dataBounds' } : undefined}
            setExtent={setXExtent}
            dataBounds={xDataBounds}
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
              updateTitleState={onTitleStateChange}
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
              extent={state?.yRightExtent || { mode: 'full' }}
              setExtent={setRightExtent}
              hasBarOrAreaOnAxis={hasBarOrAreaOnRightAxis}
              dataBounds={dataBounds.right}
              scale={state?.yRightScale}
              setScale={(scale) => {
                setState({
                  ...state,
                  yRightScale: scale,
                });
              }}
            />
          </TooltipWrapper>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
