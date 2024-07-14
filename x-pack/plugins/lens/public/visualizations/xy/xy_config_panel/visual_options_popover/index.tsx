/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { TooltipWrapper } from '@kbn/visualization-utils';
import { BarOrientationSettings } from '../../../../shared_components/bar_orientation';
import { ToolbarPopover, ValueLabelsSettings } from '../../../../shared_components';
import { MissingValuesOptions } from './missing_values_option';
import { LineCurveOption } from './line_curve_option';
import { FillOpacityOption } from './fill_opacity_option';
import { XYState } from '../../types';
import { hasHistogramSeries, isHorizontalChart } from '../../state_helpers';
import type { FramePublicAPI } from '../../../../types';
import { getDataLayers } from '../../visualization_helpers';

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

export interface VisualOptionsPopoverProps {
  state: XYState;
  setState: (newState: XYState) => void;
  datasourceLayers: FramePublicAPI['datasourceLayers'];
}

export const VisualOptionsPopover: React.FC<VisualOptionsPopoverProps> = ({
  state,
  setState,
  datasourceLayers,
}) => {
  const dataLayers = getDataLayers(state.layers);
  const isAreaPercentage = dataLayers.some(
    ({ seriesType }) => seriesType === 'area_percentage_stacked'
  );

  const hasNonBarSeries = dataLayers.some(({ seriesType }) =>
    ['area_stacked', 'area', 'line', 'area_percentage_stacked'].includes(seriesType)
  );

  const hasAreaSeries = dataLayers.some(({ seriesType }) =>
    ['area_stacked', 'area', 'area_percentage_stacked'].includes(seriesType)
  );

  const isHistogramSeries = Boolean(hasHistogramSeries(dataLayers, datasourceLayers));

  const isValueLabelsEnabled = !hasNonBarSeries;
  const isFittingEnabled = hasNonBarSeries && !isAreaPercentage;
  const isCurveTypeEnabled = hasNonBarSeries || isAreaPercentage;

  const valueLabelsDisabledReason = getValueLabelDisableReason({
    isAreaPercentage,
    isHistogramSeries,
  });

  const isDisabled = !isValueLabelsEnabled && !isFittingEnabled && !isCurveTypeEnabled;
  console.log('MMMMMM', state.shape);
  console.log(dataLayers, hasNonBarSeries);

  const isHorizontal = isHorizontalChart(state.layers);
  const opposites = {
    vertical: ['bar', 'bar_stacked', 'bar_percentage_stacked'],
    horizontal: ['bar_horizontal', 'bar_horizontal_stacked', 'bar_horizontal_percentage_stacked'],
  };

  return (
    <TooltipWrapper tooltipContent={valueLabelsDisabledReason} condition={isDisabled}>
      <ToolbarPopover
        title={i18n.translate('xpack.lens.shared.visualOptionsLabel', {
          defaultMessage: 'Visual options',
        })}
        type="visualOptions"
        groupPosition="left"
        buttonDataTestSubj="lnsVisualOptionsButton"
        isDisabled={isDisabled}
      >
        <BarOrientationSettings
          isVisible={!hasNonBarSeries}
          barOrientation={isHorizontal ? 'horizontal' : 'vertical'}
          onBarOrientationChange={(newMode) => {
            let newSeriesType;
            if (newMode === 'horizontal') {
              const index = opposites.vertical.indexOf(state.layers[0].seriesType);
              newSeriesType = opposites.horizontal[index];
            } else {
              const index = opposites.horizontal.indexOf(state.layers[0].seriesType);
              newSeriesType = opposites.vertical[index];
            }
            // for each layer, change the series type
            setState({
              ...state,
              layers: state.layers.map((layer) => ({
                ...layer,
                seriesType: newSeriesType,
              })),
            });
          }}
        />
        <LineCurveOption
          enabled={isCurveTypeEnabled}
          value={state?.curveType}
          onChange={(curveType) => {
            setState({
              ...state,
              curveType,
            });
          }}
        />

        <ValueLabelsSettings
          isVisible={isValueLabelsEnabled}
          valueLabels={state?.valueLabels ?? 'hide'}
          onValueLabelChange={(newMode) => {
            setState({ ...state, valueLabels: newMode });
          }}
        />

        <MissingValuesOptions
          isFittingEnabled={isFittingEnabled}
          fittingFunction={state?.fittingFunction}
          emphasizeFitting={state?.emphasizeFitting}
          endValue={state?.endValue}
          onFittingFnChange={(newVal) => {
            setState({ ...state, fittingFunction: newVal });
          }}
          onEmphasizeFittingChange={(newVal) => {
            setState({ ...state, emphasizeFitting: newVal });
          }}
          onEndValueChange={(newVal) => {
            setState({ ...state, endValue: newVal });
          }}
        />

        <FillOpacityOption
          isFillOpacityEnabled={hasAreaSeries}
          value={state?.fillOpacity ?? 0.3}
          onChange={(newValue) => {
            setState({
              ...state,
              fillOpacity: newValue,
            });
          }}
        />
      </ToolbarPopover>
    </TooltipWrapper>
  );
};
