/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';

const escapeIpv6 = (ip: string) => ip.replace(/:/g, '-');

export const HostDetailsLink = pure<{ children: React.ReactNode; hostId: string }>(
  ({ children, hostId }) => (
    <EuiLink href={`#/link-to/hosts/${encodeURIComponent(hostId)}`}>
      {children ? children : hostId}
    </EuiLink>
  )
);

export const NetworkDetailsLink = pure<{ ip: string }>(({ ip }) => (
  <EuiLink href={`#/link-to/network/ip/${encodeURIComponent(escapeIpv6(ip))}`}>{ip}</EuiLink>
));
