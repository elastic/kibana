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
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { Snapshot as SnapshotType } from '../../../common/graphql/types';
import { SnapshotHistogram } from './snapshot_histogram';

interface SnapshotProps {
  dangerColor: string;
  successColor: string;
  snapshot: SnapshotType;
}

export const Snapshot = ({
  dangerColor,
  successColor,
  snapshot: { up, down, total, histogram },
}: SnapshotProps) => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem grow={4}>
      <EuiPanel paddingSize="s">
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h5>
                <FormattedMessage
                  id="xpack.uptime.snapshot.endpointStatusTitle"
                  defaultMessage="Current status"
                />
              </h5>
            </EuiTitle>
            <EuiSpacer size="s" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="spaceEvenly" gutterSize="s">
              <EuiFlexItem>
                <EuiStat
                  description={i18n.translate('xpack.uptime.snapshot.stats.upDescription', {
                    defaultMessage: 'Up',
                  })}
                  textAlign="center"
                  title={up}
                  titleColor="secondary"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat
                  description={i18n.translate('xpack.uptime.snapshot.stats.downDescription', {
                    defaultMessage: 'Down',
                  })}
                  textAlign="center"
                  title={down}
                  titleColor="danger"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat
                  description={i18n.translate('xpack.uptime.snapshot.stats.totalDescription', {
                    defaultMessage: 'Total',
                  })}
                  textAlign="center"
                  title={total}
                  titleColor="subdued"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
    <EuiFlexItem grow={8}>
      <EuiPanel paddingSize="s" style={{ height: 170 }}>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.uptime.snapshot.statusOverTimeTitle"
              defaultMessage="Status over time"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        {histogram && (
          <SnapshotHistogram
            dangerColor={dangerColor}
            histogram={histogram}
            successColor={successColor}
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
