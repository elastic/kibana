/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore missing typings for EuiStat
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

export const SnapshotLoading = () => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem grow={4}>
      <EuiPanel paddingSize="s" style={{ height: 170 }}>
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h5>
                <FormattedMessage
                  id="xpack.uptime.snapshot.endpointStatusLoadingTitle"
                  defaultMessage="Current status"
                />
              </h5>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem grow={false}>
                <EuiStat
                  description={i18n.translate('xpack.uptime.snapshot.stats.upDescription', {
                    defaultMessage: 'Up',
                  })}
                  textAlign="center"
                  title="-"
                  titleColor="secondary"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  description={i18n.translate('xpack.uptime.snapshot.stats.downDescription', {
                    defaultMessage: 'Down',
                  })}
                  textAlign="center"
                  title="-"
                  titleColor="danger"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  description={i18n.translate('xpack.uptime.snapshot.stats.totalDescription', {
                    defaultMessage: 'Total',
                  })}
                  textAlign="center"
                  title="-"
                  titleColor="subdued"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);
