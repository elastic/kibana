/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore: EuiBreadcrumbs has no exported member
import { EuiBreadcrumbs, EuiPanel, EuiTitle } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { getHostsUrl, HostComponentProps } from '../../components/link_to/redirect_to_hosts';

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
