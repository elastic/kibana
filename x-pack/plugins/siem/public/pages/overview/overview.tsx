/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { pure } from 'recompose';

import { HeaderPage } from '../../components/header_page';
import { OverviewHost } from '../../components/page/overview/overview_host';
import { OverviewNetwork } from '../../components/page/overview/overview_network';
import { GlobalTime } from '../../containers/global_time';

import { Summary } from './summary';

export const OverviewComponent = pure(() => (
  <>
    <HeaderPage
      subtitle={
        <FormattedMessage
          id="xpack.siem.overview.pageSubtitle"
          defaultMessage="Security Information & Event Management with the Elastic Stack"
        />
      }
      title={<FormattedMessage id="xpack.siem.overview.pageTitle" defaultMessage="Elastic SIEM" />}
    />

    <GlobalTime>
      {({ poll, to, from }) => (
        <EuiFlexGroup>
          <Summary />
          <OverviewHost poll={poll} endDate={to} startDate={from} />
          <OverviewNetwork poll={poll} endDate={to} startDate={from} />
        </EuiFlexGroup>
      )}
    </GlobalTime>
  </>
));
