/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ToolbarPopover, TooltipWrapper, ValueLabelsSettings } from '../../../shared_components';
import { MissingValuesOptions } from './missing_values_option';
import { LineCurveOption } from './line_curve_option';
import { FillOpacityOption } from './fill_opacity_option';
import { XYState, ValidLayer } from '../../types';
import { hasHistogramSeries } from '../../state_helpers';
import type { FramePublicAPI } from '../../../types';
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
    ['area_stacked', 'area', 'line'].includes(seriesType)
  );

  const hasBarNotStacked = dataLayers.some(({ seriesType }) =>
    ['bar', 'bar_horizontal'].includes(seriesType)
  );

  const hasAreaSeries = dataLayers.some(({ seriesType }) =>
    ['area_stacked', 'area', 'area_percentage_stacked'].includes(seriesType)
  );

  const isHistogramSeries = Boolean(
    hasHistogramSeries(dataLayers as ValidLayer[], datasourceLayers)
  );

  const isValueLabelsEnabled = !hasNonBarSeries && hasBarNotStacked && !isHistogramSeries;
  const isFittingEnabled = hasNonBarSeries;
  const isCurveTypeEnabled = hasNonBarSeries || isAreaPercentage;

  const valueLabelsDisabledReason = getValueLabelDisableReason({
    isAreaPercentage,
    isHistogramSeries,
  });

  const isDisabled = !isValueLabelsEnabled && !isFittingEnabled && !isCurveTypeEnabled;

  return (
    <TooltipWrapper tooltipContent={valueLabelsDisabledReason} condition={isDisabled}>
      <ToolbarPopover
        title={i18n.translate('xpack.lens.shared.curveLabel', {
          defaultMessage: 'Visual options',
        })}
        type="visualOptions"
        groupPosition="left"
        buttonDataTestSubj="lnsVisualOptionsButton"
        isDisabled={isDisabled}
      >
        <LineCurveOption
          isCurveTypeEnabled={isCurveTypeEnabled}
          value={state?.curveType}
          onChange={(id) => {
            setState({
              ...state,
              curveType: id,
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
