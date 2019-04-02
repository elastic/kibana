/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';

import { OverviewHost } from '../../components/page/overview/overview_host';
import { OverviewNetwork } from '../../components/page/overview/overview_network';
import { GlobalTime } from '../../containers/global_time';
import { PageContent, PageContentBody } from '../styles';

import { Summary } from './summary';
import { Welcome } from './welcome';

export const OverviewComponent = pure(() => (
  <PageContent>
    <Welcome />
    <PageContentBody>
      <Summary />
      <GlobalTime>
        {({ poll, to, from }) => (
          <EuiFlexGroup>
            <OverviewHost poll={poll} endDate={to} startDate={from} />
            <OverviewNetwork poll={poll} endDate={to} startDate={from} />
          </EuiFlexGroup>
        )}
      </GlobalTime>
    </PageContentBody>
  </PageContent>
));
