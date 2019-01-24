/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore: EuiBreadcrumbs has no exported member
  EuiBreadcrumbs,
  EuiFlexGroup,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { getHostsUrl, HostComponentProps } from '../../components/link_to/redirect_to_hosts';
import { HostDetailsPanel } from '../../components/page/hosts/hosts_details_panel';

export const HostDetails = pure<HostComponentProps>(({ match }) => (
  <>
    <HostBreadcrumbWrapper breadcrumbs={getBreadcrumbs(match.params.hostId!)} />
    <EuiPanel>
      <EuiTitle>
        <h2>Host Details</h2>
      </EuiTitle>
      <div>
        Match Params: <pre>{JSON.stringify(match, null, 2)}</pre>
      </div>
    </EuiPanel>
    <EuiSpacer size="l" />
    <EuiFlexGroup>
      <HostDetailsPanel />
    </EuiFlexGroup>
  </>
));

const getBreadcrumbs = (hostId: string) => [
  {
    text: 'Hosts',
    href: getHostsUrl(),
  },
  {
    text: hostId,
  },
];

const HostBreadcrumbWrapper = styled(EuiBreadcrumbs)`
  margin: 10px 0;
`;
