/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';

import { encodeIpv6 } from '../../lib/helpers';

export const HostDetailsLink = pure<{ children?: React.ReactNode; hostId: string }>(
  ({ children, hostId }) => (
    <EuiLink href={`#/link-to/hosts/${encodeURIComponent(hostId)}`}>
      {children ? children : hostId}
    </EuiLink>
  )
);

export const IPDetailsLink = pure<{ children?: React.ReactNode; ip: string }>(
  ({ children, ip }) => (
    <EuiLink href={`#/link-to/network/ip/${encodeURIComponent(encodeIpv6(ip))}`}>
      {children ? children : ip}
    </EuiLink>
  )
);

export const GoogleLink = pure<{ children?: React.ReactNode; link: string }>(
  ({ children, link }) => (
    <EuiLink href={`https://www.google.com/search?q=${encodeURI(link)}`} target="_blank">
      {children ? children : link}
    </EuiLink>
  )
);

export const TotalVirusLink = pure<{ children?: React.ReactNode; link: string }>(
  ({ children, link }) => (
    <EuiLink href={`https://www.virustotal.com/#/search/${encodeURI(link)}`} target="_blank">
      {children ? children : link}
    </EuiLink>
  )
);
