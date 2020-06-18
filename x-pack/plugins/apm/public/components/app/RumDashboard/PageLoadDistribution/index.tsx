/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import {
  Axis,
  Chart,
  ScaleType,
  LineSeries,
  CurveType,
  BrushEndListener,
  Settings,
  TooltipValueFormatter,
  TooltipValue,
} from '@elastic/charts';
import { Position } from '@elastic/charts/dist/utils/commons';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';
import { ChartWrapper } from '../ChartWrapper';
import { PercentileAnnotations } from './PercentileAnnotations';
import {
  PageLoadDistLabel,
  PageLoadTimeLabel,
  PercPageLoadedLabel,
  ResetZoomLabel,
} from '../translations';

export const PageLoadDistribution = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end } = urlParams;

  const [percentileRange, setPercentileRange] = useState<{
    min: string | null;
    max: string | null;
  }>({
    min: null,
    max: null,
  });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          pathname: '/api/apm/rum-client/page-load-distribution',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              ...(percentileRange.min && percentileRange.max
                ? {
                    minPercentile: percentileRange.min,
                    maxPercentile: percentileRange.max,
                  }
                : {}),
            },
          },
        });
      }
    },
    [end, start, uiFilters, percentileRange.min, percentileRange.max]
  );

  const onBrushEnd: BrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [minX, maxX] = x;
    setPercentileRange({ min: String(minX), max: String(maxX) });
  };

  const headerFormatter: TooltipValueFormatter = (tooltip: TooltipValue) => {
    return (
      <div>
        <p>{tooltip.value} seconds</p>
      </div>
    );
  };

  const tooltipProps = {
    headerFormatter,
  };

  return (
    <div>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{PageLoadDistLabel}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="inspect"
            size="s"
            onClick={() => {
              setPercentileRange({ min: null, max: null });
            }}
            fill={percentileRange.min !== null && percentileRange.max !== null}
          >
            {ResetZoomLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <ChartWrapper loading={status !== 'success'} height="200px">
        <Chart className="story-chart">
          <Settings onBrushEnd={onBrushEnd} tooltip={tooltipProps} />
          <PercentileAnnotations percentiles={data?.percentiles} />
          <Axis
            id="bottom"
            title={PageLoadTimeLabel}
            position={Position.Bottom}
          />
          <Axis
            id="left"
            title={PercPageLoadedLabel}
            position={Position.Left}
            tickFormat={(d) => Number(d).toFixed(1) + ' %'}
          />
          <LineSeries
            id={'PagesPercentage'}
            name={PercPageLoadedLabel}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            data={data?.pageLoadDistribution ?? []}
            curve={CurveType.CURVE_NATURAL}
          />
        </Chart>
      </ChartWrapper>
    </div>
  );
};
