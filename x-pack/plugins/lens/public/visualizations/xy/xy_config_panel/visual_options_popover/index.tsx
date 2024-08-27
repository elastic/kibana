/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { TooltipWrapper } from '@kbn/visualization-utils';
import { EuiHorizontalRule } from '@elastic/eui';
import { BarOrientationSettings } from '../../../../shared_components/bar_orientation';
import { SeriesStackingSetting } from '../../../../shared_components/series_layer_stacking';
import { ToolbarPopover } from '../../../../shared_components';
import { MissingValuesOptions } from './missing_values_option';
import { LineCurveOption } from './line_curve_option';
import { FillOpacityOption } from './fill_opacity_option';
import { SeriesType, XYState } from '../../types';
import {
  flipSeriesType,
  getBarSeriesLayers,
  getUniqueSeriesTypes,
  hasAreaSeries,
  hasHistogramSeries,
  hasNonBarSeries,
  isAreaLayer,
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

  const getBarSeriesType = () => {
    const barSeriesTypes = getUniqueSeriesTypes(barSeriesLayers);
    return barSeriesTypes.length === 1 ? barSeriesTypes[0] : 'bar';
  };

  const areaSeriesLayers = dataLayers.filter(({ seriesType }) => seriesType.startsWith('area'));

  const getAreaSeriesType = () => {
    const seriesType = getUniqueSeriesTypes(areaSeriesLayers);
    return seriesType.length === 1 ? seriesType[0] : 'area';
  };

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
        {!isHasNonBarSeries && (
          <BarOrientationSettings
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
        )}

        {barSeriesLayers.length > 1 && (
          <>
            <SeriesStackingSetting
              seriesType={getBarSeriesType()}
              onSeriesType={(newSeriesType: string) => {
                setState({
                  ...state,
                  layers: state.layers.map((layer) =>
                    isBarLayer(layer)
                      ? {
                          ...layer,
                          seriesType: newSeriesType as SeriesType,
                        }
                      : layer
                  ),
                });
              }}
            />
            <EuiHorizontalRule margin="s" />
          </>
        )}

        {areaSeriesLayers.length > 1 && (
          <SeriesStackingSetting
            label={i18n.translate('xpack.lens.shared.areaStacking', {
              defaultMessage: 'Area layer stacking',
            })}
            seriesType={getAreaSeriesType()}
            onSeriesType={(newSeriesType: string) => {
              setState({
                ...state,
                layers: state.layers.map((layer) =>
                  isAreaLayer(layer)
                    ? {
                        ...layer,
                        seriesType: newSeriesType as SeriesType,
                      }
                    : layer
                ),
              });
            }}
          />
        )}
        {hasAreaSeries(dataLayers) && (
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

            <EuiHorizontalRule margin="s" />
          </>
        )}
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
