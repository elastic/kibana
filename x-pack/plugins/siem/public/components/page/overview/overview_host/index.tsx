/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';

import { OverviewHostQuery } from '../../../../containers/overview/overview_host';
import { OverviewHostStats } from '../overview_host_stats';

import * as i18n from '../translations';

export interface OwnProps {
  poll: number;
  startDate: number;
  endDate: number;
}

export const OverviewHost = pure<OwnProps>(({ endDate, poll, startDate }) => (
  <EuiFlexItem>
    <EuiPanel>
      <EuiTitle>
        <h2>{i18n.HOSTS_HEADING}</h2>
      </EuiTitle>
      <OverviewHostQuery endDate={endDate} poll={poll} sourceId="default" startDate={startDate}>
        {({ overviewHost }) => <OverviewHostStats data={overviewHost} />}
      </OverviewHostQuery>
    </EuiPanel>
  </EuiFlexItem>
));
