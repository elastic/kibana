/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { pure } from 'recompose';

import { OverviewNetworkQuery } from '../../../../containers/overview/overview_network';
import { OverviewNetworkStats } from '../overview_network_stats';

export interface OwnProps {
  poll: number;
  startDate: number;
  endDate: number;
}

export const OverviewNetwork = pure<OwnProps>(({ endDate, poll, startDate }) => (
  <EuiFlexItem>
    <EuiPanel>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.siem.overview.networkTitle"
                defaultMessage="Network Ingest Indices"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton href={`#/link-to/network/`}>
            <FormattedMessage
              id="xpack.siem.overview.networkAction"
              defaultMessage="View Network"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule />

      <OverviewNetworkQuery endDate={endDate} poll={poll} sourceId="default" startDate={startDate}>
        {({ overviewNetwork }) => <OverviewNetworkStats data={overviewNetwork} />}
      </OverviewNetworkQuery>
    </EuiPanel>
  </EuiFlexItem>
));
