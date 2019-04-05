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

import { OverviewHostQuery } from '../../../../containers/overview/overview_host';
import { OverviewHostStats } from '../overview_host_stats';

export interface OwnProps {
  poll: number;
  startDate: number;
  endDate: number;
}

export const OverviewHost = pure<OwnProps>(({ endDate, poll, startDate }) => (
  <EuiFlexItem>
    <EuiPanel>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.siem.overview.hostsTitle"
                defaultMessage="Hosts Ingest Indices"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton href={`#/link-to/hosts/`}>
            <FormattedMessage id="xpack.siem.overview.hostsAction" defaultMessage="View Hosts" />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule />

      <OverviewHostQuery endDate={endDate} poll={poll} sourceId="default" startDate={startDate}>
        {({ overviewHost }) => <OverviewHostStats data={overviewHost} />}
      </OverviewHostQuery>
    </EuiPanel>
  </EuiFlexItem>
));
