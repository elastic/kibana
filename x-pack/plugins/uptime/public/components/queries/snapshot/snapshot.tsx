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
import { SnapshotHistogram } from '../../functional/snapshot_histogram';
import { getSnapshotQuery } from './get_snapshot';

interface SnapshotProps {
  dateRangeStart: number;
  dateRangeEnd: number;
  autorefreshEnabled: boolean;
  autorefreshInterval: number;
  filters?: string;
}

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
              {histogram && <SnapshotHistogram histogram={histogram} />}
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
