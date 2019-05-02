/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import React from 'react';

interface IntegrationLinkProps {
  ariaLabel: string;
  href: string;
  iconType: 'apmApp' | 'infraApp' | 'loggingApp';
  message: string;
  tooltipContent: string;
}

export const IntegrationLink = ({
  ariaLabel,
  href,
  iconType,
  message,
  tooltipContent,
}: IntegrationLinkProps) => (
  <EuiLink aria-label={ariaLabel} color="subdued" href={href}>
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={tooltipContent} position="top">
          <EuiIcon type={iconType} />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem>{message}</EuiFlexItem>
    </EuiFlexGroup>
  </EuiLink>
);
