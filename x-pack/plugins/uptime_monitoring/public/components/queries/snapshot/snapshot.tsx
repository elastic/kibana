/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore missing type
  EuiAreaSeries,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore missing type
  EuiHistogramSeries,
  // @ts-ignore missing type
  EuiPanel,
  // @ts-ignore missing type
  EuiSeriesChart,
  // @ts-ignore missing type
  EuiSeriesChartUtils,
  // @ts-ignore missing type
  EuiStat,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { Query } from 'react-apollo';
import { getSnapshotQuery } from './get_snapshot';

interface SnapshotProps {
  dateRangeStart: number;
  dateRangeEnd: number;
  autorefreshEnabled: boolean;
  autorefreshInterval: number;
  filters?: string;
}

const formatHistogramData = (histogram: any) => {
  const histogramSeriesData: { upSeriesData: any[]; downSeriesData: any[] } = {
    upSeriesData: [],
    downSeriesData: [],
  };
  histogram.forEach(({ data }: { data: any }) => {
    data.forEach(({ x, x0, downCount }: { x: any; x0: any; downCount: any }) => {
      const upEntry = histogramSeriesData.upSeriesData.find(
        histogramDataPoint => histogramDataPoint.x === x && histogramDataPoint.x0 === x0
      );
      const downEntry = histogramSeriesData.downSeriesData.find(
        histogramDataPoint => histogramDataPoint.x === x && histogramDataPoint.x0 === x0
      );
      if (downCount) {
        if (downEntry) {
          downEntry.y += 1;
        } else {
          histogramSeriesData.downSeriesData.push({ x, x0, y: 1 });
        }
      } else {
        if (upEntry) {
          upEntry.y += 1;
        } else {
          histogramSeriesData.upSeriesData.push({ x, x0, y: 1 });
        }
      }
    });
  });
  return histogramSeriesData;
};

export const Snapshot = ({
  dateRangeStart,
  dateRangeEnd,
  autorefreshEnabled,
  autorefreshInterval,
  filters,
}: SnapshotProps) => (
  <Query
    pollInterval={autorefreshEnabled ? autorefreshInterval : undefined}
    query={getSnapshotQuery}
    // TODO downCount and windowSize aren't needed for MVP
    variables={{ dateRangeStart, dateRangeEnd, downCount: 1, windowSize: 1, filters }}
  >
    {({ loading, error, data }) => {
      if (loading) {
        return 'Loading...';
      }
      if (error) {
        return `Error ${error.message}`;
      }
      const {
        snapshot: { up, down, total, histogram },
      } = data;

      const { upSeriesData, downSeriesData } = formatHistogramData(histogram);

      return (
        <EuiFlexGroup alignItems="baseline" gutterSize="xl">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h5>Endpoint status</h5>
            </EuiTitle>
            <EuiPanel>
              <EuiFlexGroup justifyContent="spaceEvenly" gutterSize="xl">
                <EuiFlexItem>
                  {/* TODO: this is a UI hack that needs to be replaced */}
                  <EuiPanel>
                    <EuiStat description="Up" textAlign="center" title={up} titleColor="primary" />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel>
                    <EuiStat
                      description="Down"
                      textAlign="center"
                      title={down}
                      titleColor="danger"
                    />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel>
                    <EuiStat
                      description="Total"
                      textAlign="center"
                      title={total}
                      titleColor="subdued"
                    />
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem style={{ paddingTop: '12px' }}>
            <EuiTitle size="xs">
              <h5>Status over time</h5>
            </EuiTitle>
            {/* TODO: this is a UI hack that should be replaced */}
            <EuiPanel paddingSize="s">
              {histogram && (
                <EuiSeriesChart
                  width={600}
                  height={107}
                  stackBy="y"
                  xType={EuiSeriesChartUtils.SCALE.TIME}
                >
                  {}
                  <EuiHistogramSeries data={upSeriesData} name="Up" color="green" />
                  <EuiHistogramSeries data={downSeriesData} name="Down" color="red" />
                </EuiSeriesChart>
              )}
              {!histogram && (
                <EuiEmptyPrompt
                  title={
                    <EuiTitle>
                      <h5>No Histogram Data Available</h5>
                    </EuiTitle>
                  }
                  body={<p>Sorry, there is no data available for the histogram</p>}
                />
              )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }}
  </Query>
);
