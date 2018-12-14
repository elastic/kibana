/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore missing type
  EuiAreaSeries,
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
        snapshot: {
          up,
          down,
          trouble,
          total,
          histogram: { upSeries, downSeries },
        },
      } = data;
      return (
        <EuiFlexGroup alignItems="center" gutterSize="xl">
          <EuiFlexItem>
            <EuiPanel>
              <EuiFlexGroup justifyContent="spaceEvenly" gutterSize="xl">
                <EuiFlexItem grow={false}>
                  <EuiPanel grow={false} style={{ minWidth: '100px' }}>
                    <EuiStat description="Up" textAlign="center" title={up} titleColor="primary" />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPanel grow={false} style={{ minWidth: '100px' }}>
                    <EuiStat
                      description="Down"
                      textAlign="center"
                      title={down}
                      titleColor="danger"
                    />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPanel grow={false} style={{ minWidth: '100px' }}>
                    <EuiStat
                      description="Jitter"
                      textAlign="center"
                      title={trouble}
                      titleColor="secondary"
                    />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPanel grow={false} style={{ minWidth: '100px' }}>
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
            <EuiPanel paddingSize="s">
              <EuiSeriesChart
                width={600}
                height={155}
                stackBy="y"
                xType={EuiSeriesChartUtils.SCALE.TIME}
              >
                <EuiHistogramSeries data={upSeries} name="Up" color="green" />
                <EuiHistogramSeries data={downSeries} name="Down" color="red" />
              </EuiSeriesChart>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }}
  </Query>
);
