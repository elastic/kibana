/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiLink } from '@elastic/eui';
import React from 'react';

interface IntegrationLinkProps {
  ariaLabel: string;
  href: string;
  iconType: 'apmApp' | 'infraApp' | 'loggingApp';
}

export const IntegrationLink = ({ ariaLabel, href, iconType }: IntegrationLinkProps) => (
  <EuiLink aria-label={ariaLabel} href={href}>
    <EuiIcon type={iconType} />
  </EuiLink>
);
