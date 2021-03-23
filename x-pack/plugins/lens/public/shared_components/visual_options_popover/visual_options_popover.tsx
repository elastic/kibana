/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ToolbarPopover } from '../toolbar_popover';
import { MissingValuesOptions } from './missing_values_option';
import { LineCurveOption } from './line_curve_option';
import { XYState } from '../..';
import { hasHistogramSeries } from '../../xy_visualization/state_helpers';
import { ValidLayer } from '../../xy_visualization/types';
import { TooltipWrapper } from '../../xy_visualization/tooltip_wrapper';
import { FramePublicAPI } from '../../types';

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
  const isAreaPercentage = state?.layers.some(
    ({ seriesType }) => seriesType === 'area_percentage_stacked'
  );

  const hasNonBarSeries = state?.layers.some(({ seriesType }) =>
    ['area_stacked', 'area', 'line'].includes(seriesType)
  );

  const hasBarNotStacked = state?.layers.some(({ seriesType }) =>
    ['bar', 'bar_horizontal'].includes(seriesType)
  );

  const isHistogramSeries = Boolean(
    hasHistogramSeries(state?.layers as ValidLayer[], datasourceLayers)
  );

  const isValueLabelsEnabled = !hasNonBarSeries && hasBarNotStacked && !isHistogramSeries;
  const isFittingEnabled = hasNonBarSeries;
  const isCurveTypeEnabled = hasNonBarSeries || isAreaPercentage;

  const valueLabelsDisabledReason = getValueLabelDisableReason({
    isAreaPercentage,
    isHistogramSeries,
  });

  return (
    <TooltipWrapper
      tooltipContent={valueLabelsDisabledReason}
      condition={!isValueLabelsEnabled && !isFittingEnabled}
    >
      <ToolbarPopover
        title={i18n.translate('xpack.lens.shared.curveLabel', {
          defaultMessage: 'Visual options',
        })}
        type="visualOptions"
        groupPosition="right"
        buttonDataTestSubj="lnsVisualOptionsButton"
        isDisabled={!isValueLabelsEnabled && !isFittingEnabled && !isCurveTypeEnabled}
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

        <MissingValuesOptions
          isValueLabelsEnabled={isValueLabelsEnabled}
          isFittingEnabled={isFittingEnabled}
          valueLabels={state?.valueLabels}
          fittingFunction={state?.fittingFunction}
          onValueLabelChange={(newMode) => {
            setState({ ...state, valueLabels: newMode });
          }}
          onFittingFnChange={(newVal) => {
            setState({ ...state, fittingFunction: newVal });
          }}
        />
      </ToolbarPopover>
    </TooltipWrapper>
  );
};
