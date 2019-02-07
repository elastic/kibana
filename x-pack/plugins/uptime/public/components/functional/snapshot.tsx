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
  EuiStat,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { Snapshot as SnapshotType } from '../../../common/graphql/types';
import { SnapshotHistogram } from './snapshot_histogram';

interface SnapshotProps {
  dangerColor: string;
  primaryColor: string;
  snapshot: SnapshotType;
  windowWidth: number;
}

export const Snapshot = ({
  dangerColor,
  primaryColor,
  snapshot: { up, down, total, histogram },
  windowWidth,
}: SnapshotProps) => (
  <EuiFlexGroup alignItems="baseline" gutterSize="xl">
    <EuiFlexItem grow={4}>
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
    <EuiFlexItem grow={8} style={{ paddingTop: '12px', paddingRight: '12px' }}>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.uptime.snapshot.statusOverTimeTitle"
            defaultMessage="Status over time"
          />
        </h5>
      </EuiTitle>
      {/* TODO: this is a UI hack that should be replaced */}
      <EuiPanel paddingSize="s" style={{ maxHeight: '137px' }}>
        {histogram && (
          <SnapshotHistogram
            dangerColor={dangerColor}
            histogram={histogram}
            primaryColor={primaryColor}
            windowWidth={windowWidth}
          />
        )}
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
