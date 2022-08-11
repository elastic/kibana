/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';

export const CloudPosturePageTitle = ({ title, isBeta }: { title: string; isBeta: boolean }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiTitle>
        <h1>{title}</h1>
      </EuiTitle>
    </EuiFlexItem>
    {isBeta && (
      <EuiFlexItem
        grow={false}
        css={css`
          // tooltipContent wraps EuiBetaBadge with a span element which breaks alignment
          .euiToolTipAnchor {
            display: flex;
          }
        `}
      >
        <EuiBetaBadge
          label={i18n.translate('xpack.csp.common.cloudPosturePageTitle.BetaBadgeLabel', {
            defaultMessage: 'Beta',
          })}
          tooltipContent={i18n.translate(
            'xpack.csp.common.cloudPosturePageTitle.BetaBadgeTooltip',
            {
              defaultMessage:
                'This functionality is in beta and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in beta are not subject to the support SLA of official GA features.',
            }
          )}
        />
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
