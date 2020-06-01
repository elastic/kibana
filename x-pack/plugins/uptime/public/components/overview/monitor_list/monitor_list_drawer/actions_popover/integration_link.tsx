/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';

interface IntegrationLinkProps {
  ariaLabel: string;
  href: string | undefined;
  iconType: 'apmApp' | 'metricsApp' | 'logsApp';
  message: string;
  tooltipContent: string;
}

export const IntegrationLink = ({
  ariaLabel,
  href,
  iconType,
  message,
  tooltipContent,
}: IntegrationLinkProps) =>
  typeof href === 'undefined' ? (
    <EuiFlexGroup responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.uptime.integrationLink.missingDataMessage', {
            defaultMessage: 'Required data for this integration was not found.',
          })}
        >
          <EuiIcon type={iconType} />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">{message}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiLink aria-label={ariaLabel} href={href}>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={tooltipContent} position="top">
            <EuiIcon type={iconType} />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>{message}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiLink>
  );
