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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { Query } from 'react-apollo';
import { UptimeCommonProps } from '../../../uptime_app';
import { SnapshotHistogram } from '../../functional';
import { getSnapshotQuery } from './get_snapshot';

interface SnapshotProps {
  filters?: string;
}

type Props = SnapshotProps & UptimeCommonProps;

export const Snapshot = ({
  dateRangeStart,
  dateRangeEnd,
  autorefreshIsPaused,
  autorefreshInterval,
  filters,
}: Props) => (
  <Query
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
    query={getSnapshotQuery}
    // TODO downCount and windowSize aren't needed for MVP
    variables={{ dateRangeStart, dateRangeEnd, downCount: 1, windowSize: 1, filters }}
  >
    {({ loading, error, data }) => {
      if (loading) {
        return i18n.translate('xpack.uptime.snapshot.loadingMessage', {
          defaultMessage: 'Loading…',
        });
      }
      if (error) {
        return i18n.translate('xpack.uptime.snapshot.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {message}',
        });
      }
      const {
        snapshot: { up, down, total, histogram },
      } = data;

      return (
        <EuiFlexGroup alignItems="baseline" gutterSize="xl">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h5>
                <FormattedMessage
                  id="xpack.uptime.snapshot.endpointStatusTitle"
                  defaultMessage="Endpoint status"
                />
              </h5>
            </EuiTitle>
            <EuiPanel>
              <EuiFlexGroup justifyContent="spaceEvenly" gutterSize="xl">
                <EuiFlexItem>
                  {/* TODO: this is a UI hack that needs to be replaced */}
                  <EuiPanel>
                    <EuiStat
                      description={i18n.translate('xpack.uptime.snapshot.stats.upDescription', {
                        defaultMessage: 'Up',
                      })}
                      textAlign="center"
                      title={up}
                      titleColor="primary"
                    />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel>
                    <EuiStat
                      description={i18n.translate('xpack.uptime.snapshot.stats.downDescription', {
                        defaultMessage: 'Down',
                      })}
                      textAlign="center"
                      title={down}
                      titleColor="danger"
                    />
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiPanel>
                    <EuiStat
                      description={i18n.translate('xpack.uptime.snapshot.stats.totalDescription', {
                        defaultMessage: 'Total',
                      })}
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
              <h5>
                <FormattedMessage
                  id="xpack.uptime.snapshot.statusOverTimeTitle"
                  defaultMessage="Status over time"
                />
              </h5>
            </EuiTitle>
            {/* TODO: this is a UI hack that should be replaced */}
            <EuiPanel paddingSize="s">
              {histogram && <SnapshotHistogram histogram={histogram} />}
              {!histogram && (
                <EuiEmptyPrompt
                  title={
                    <EuiTitle>
                      <h5>
                        <FormattedMessage
                          id="xpack.uptime.snapshot.noDataTitle"
                          defaultMessage="No histogram data available"
                        />
                      </h5>
                    </EuiTitle>
                  }
                  body={
                    <p>
                      <FormattedMessage
                        id="xpack.uptime.snapshot.noDataDescription"
                        defaultMessage="Sorry, there is no data available for the histogram"
                      />
                    </p>
                  }
                />
              )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }}
  </Query>
);
