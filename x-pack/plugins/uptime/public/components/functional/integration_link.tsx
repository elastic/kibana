/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface IntegrationLinkProps {
  ariaLabel: string;
  href: string | undefined;
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
}: IntegrationLinkProps) =>
  typeof href === 'undefined' ? (
    <EuiFlexGroup>
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
