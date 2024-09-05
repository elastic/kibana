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
import { ToolbarDivider } from '../../../../shared_components/toolbar_divider';
import { ToolbarPopover } from '../../../../shared_components';
import { MissingValuesOptions } from './missing_values_option';
import { LineCurveOption } from './line_curve_option';
import { FillOpacityOption } from './fill_opacity_option';
import { XYState } from '../../types';
import {
  flipSeriesType,
  getBarSeriesLayers,
  hasAreaSeries,
  hasHistogramSeries,
  hasNonBarSeries,
  isBarLayer,
  isHorizontalChart,
} from '../../state_helpers';
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

const PANEL_STYLE = {
  width: 500,
};

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

  const isHasNonBarSeries = hasNonBarSeries(dataLayers);
  const isHistogramSeries = Boolean(hasHistogramSeries(dataLayers, datasourceLayers));

  const isFittingEnabled = isHasNonBarSeries && !isAreaPercentage;
  const isCurveTypeEnabled = isHasNonBarSeries || isAreaPercentage;

  const valueLabelsDisabledReason = getValueLabelDisableReason({
    isAreaPercentage,
    isHistogramSeries,
  });
  const isHorizontal = isHorizontalChart(state.layers);

  const isDisabled = !isFittingEnabled && !isCurveTypeEnabled && isHasNonBarSeries;

  const barSeriesLayers = getBarSeriesLayers(dataLayers);

  const hasAnyBarSetting = !!barSeriesLayers.length;
  const hasAreaSettings = hasAreaSeries(dataLayers);
  const shouldDisplayDividerHr = !!(hasAnyBarSetting && hasAreaSettings);

  return (
    <TooltipWrapper tooltipContent={valueLabelsDisabledReason} condition={isDisabled}>
      <ToolbarPopover
        title={i18n.translate('xpack.lens.shared.appearanceLabel', {
          defaultMessage: 'Appearance',
        })}
        type="visualOptions"
        groupPosition="none"
        buttonDataTestSubj="lnsVisualOptionsButton"
        data-test-subj="lnsVisualOptionsPopover"
        isDisabled={isDisabled}
        panelStyle={PANEL_STYLE}
      >
        {hasAnyBarSetting ? (
          <BarOrientationSettings
            isDisabled={isHasNonBarSeries}
            barOrientation={isHorizontal ? 'horizontal' : 'vertical'}
            onBarOrientationChange={() => {
              const newSeriesType = flipSeriesType(dataLayers[0].seriesType);
              setState({
                ...state,
                layers: state.layers.map((layer) =>
                  isBarLayer(layer)
                    ? {
                        ...layer,
                        seriesType: newSeriesType,
                      }
                    : layer
                ),
              });
            }}
          />
        ) : null}

        {shouldDisplayDividerHr ? <ToolbarDivider /> : null}

        {hasAreaSettings ? (
          <>
            <FillOpacityOption
              isFillOpacityEnabled={true}
              value={state?.fillOpacity ?? 0.3}
              onChange={(newValue) => {
                setState({
                  ...state,
                  fillOpacity: newValue,
                });
              }}
            />

            <ToolbarDivider />
          </>
        ) : null}
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
      </ToolbarPopover>
    </TooltipWrapper>
  );
};
