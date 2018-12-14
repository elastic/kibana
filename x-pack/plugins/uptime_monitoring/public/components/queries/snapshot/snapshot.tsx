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
}

const formatHistogramData = (histogram: any) => {
  const a: { up: any[]; down: any[] } = {
    up: [],
    down: [],
  };
  histogram.forEach(({ data }: { data: any }) => {
    data.forEach(({ x, x0, downCount }: { x: any; x0: any; downCount: any }) => {
      const upEntry = a.up.find(f => f.x === x && f.x0 === x0);
      const downEntry = a.down.find(f => f.x === x && f.x0 === x0);
      if (downCount) {
        if (downEntry) {
          downEntry.y += 1;
        } else {
          const vvv = { x, x0, y: 1 };
          a.down.push(vvv);
        }
      } else {
        if (upEntry) {
          upEntry.y += 1;
        } else {
          a.up.push({ x, x0, y: 1 });
        }
      }
    });
  });
  return a;
};

export const Snapshot = ({
  dateRangeStart,
  dateRangeEnd,
  autorefreshEnabled,
  autorefreshInterval,
}: SnapshotProps) => (
  <Query
    pollInterval={autorefreshEnabled ? autorefreshInterval : undefined}
    query={getSnapshotQuery}
    // TODO downCount and windowSize aren't needed for MVP
    variables={{ dateRangeStart, dateRangeEnd, downCount: 1, windowSize: 1 }}
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

      const { up: histUp, down: histDown } = formatHistogramData(histogram);

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
                  <EuiPanel style={{ minWidth: '150px', minHeight: '150px' }}>
                    <EuiStat description="Up" textAlign="center" title={up} titleColor="primary" />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel style={{ minWidth: '150px' }}>
                    <EuiStat
                      description="Down"
                      textAlign="center"
                      title={down}
                      titleColor="danger"
                    />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel style={{ minWidth: '150px' }}>
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
            <EuiPanel style={{ minHeight: '150px' }} paddingSize="s">
              {histogram && (
                <EuiSeriesChart
                  width={600}
                  height={155}
                  stackBy="y"
                  xType={EuiSeriesChartUtils.SCALE.TIME}
                >
                  {}
                  <EuiHistogramSeries data={histUp} name="Up" color="green" />
                  <EuiHistogramSeries data={histDown} name="Down" color="red" />
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
