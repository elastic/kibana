/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { pure } from 'recompose';

import { HeaderPanel } from '../../../header_panel';
import { manageQuery } from '../../../page/manage_query';
import { OverviewNetworkQuery } from '../../../../containers/overview/overview_network';
import { inputsModel } from '../../../../store/inputs';
import { OverviewNetworkStats } from '../overview_network_stats';

export interface OwnProps {
  startDate: number;
  endDate: number;
  setQuery: (
    { id, loading, refetch }: { id: string; loading: boolean; refetch: inputsModel.Refetch }
  ) => void;
}

const OverviewNetworkStatsManage = manageQuery(OverviewNetworkStats);

export const OverviewNetwork = pure<OwnProps>(({ endDate, startDate, setQuery }) => (
  <EuiFlexItem>
    <EuiPanel>
      <HeaderPanel
        border
        subtitle={
          <FormattedMessage
            id="xpack.siem.overview.networkSubtitle"
            defaultMessage="Showing: Last 24 Hours"
          />
        }
        title={
          <FormattedMessage id="xpack.siem.overview.networkTitle" defaultMessage="Network Events" />
        }
      >
        <EuiButton href="#/link-to/network/">
          <FormattedMessage id="xpack.siem.overview.networkAction" defaultMessage="View Network" />
        </EuiButton>
      </HeaderPanel>

      <OverviewNetworkQuery endDate={endDate} sourceId="default" startDate={startDate}>
        {({ overviewNetwork, loading, id, refetch }) => (
          <OverviewNetworkStatsManage
            loading={loading}
            data={overviewNetwork}
            setQuery={setQuery}
            id={id}
            refetch={refetch}
          />
        )}
      </OverviewNetworkQuery>
    </EuiPanel>
  </EuiFlexItem>
));
