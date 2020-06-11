/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import {
  Axis,
  Chart,
  ScaleType,
  LineSeries,
  CurveType,
  BrushEndListener,
  Settings,
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
} from '../translations';

export const PageLoadDistribution = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end } = urlParams;

  const [percentileRange, setPercentileRange] = useState({ min: 0, max: 99 });

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
              minPercentile: percentileRange.min,
              maxPercentile: percentileRange.max,
            },
          },
        });
      }
    },
    [end, start, uiFilters, percentileRange]
  );

  const onBrushEnd: BrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [minX, maxX] = x;
  };

  return (
    <div>
      <EuiSpacer size="l" />
      <EuiTitle size="s">
        <h3>{PageLoadDistLabel}</h3>
      </EuiTitle>
      <ChartWrapper loading={status !== 'success'} height="300px">
        <Chart className="story-chart">
          <Settings onBrushEnd={onBrushEnd} />
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
