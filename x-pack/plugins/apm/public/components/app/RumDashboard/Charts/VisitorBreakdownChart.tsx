/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Chart,
  Datum,
  PartialTheme,
  Partition,
  PartitionLayout,
} from '@elastic/charts';
import styled from 'styled-components';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { ChartWrapper } from '../ChartWrapper';
import { I18LABELS } from '../translations';
import { ApmPluginStartDeps } from '../../../../plugin';

const StyleChart = styled.div`
  height: 100%;
`;

interface Props {
  options?: Array<{
    count: number;
    name: string;
  }>;
  loading: boolean;
}

const themeOverrides: PartialTheme = {
  legend: {
    verticalWidth: 100,
  },
};

export function VisitorBreakdownChart({ loading, options }: Props) {
  const { services: { charts: { SharedChartSettings, theme } } } = useKibana<ApmPluginStartDeps>();

  return (
    <ChartWrapper loading={loading} height="245px" maxWidth="430px">
      <StyleChart>
        <Chart>
          <SharedChartSettings theme={themeOverrides} showLegend />
          <Partition
            id="spec_1"
            data={
              options?.length ? options : [{ count: 1, name: I18LABELS.noData }]
            }
            valueAccessor={(d: Datum) => d.count as number}
            valueGetter="percent"
            percentFormatter={(d: number) =>
              `${Math.round((d + Number.EPSILON) * 100) / 100}%`
            }
            layers={[
              {
                groupByRollup: (d: Datum) => d.name,
                shape: {
                  fillColor: (d) =>
                    theme.useChartsTheme().colors?.vizColors?.[d.sortIndex]!,
                },
              },
            ]}
            config={{
              partitionLayout: PartitionLayout.sunburst,
              linkLabel: { maximumSection: Infinity, maxCount: 0 },
              margin: { top: 0, bottom: 0, left: 0, right: 0 },
              outerSizeRatio: 1, // - 0.5 * Math.random(),
              circlePadding: 4,
              clockwiseSectors: false,
            }}
          />
        </Chart>
      </StyleChart>
    </ChartWrapper>
  );
}
