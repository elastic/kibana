/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface PageTitleProps {
  title: string | undefined;
  active?: boolean;
}

export function PageTitle({ title, active }: PageTitleProps) {
  const label = active
    ? i18n.translate('xpack.observability.alertDetails.alertActiveState', {
        defaultMessage: 'Active',
      })
    : i18n.translate('xpack.observability.alertDetails.alertRecoveredState', {
        defaultMessage: 'Recovered',
      });

  return (
    <div data-test-subj="page-title-container">
      {title}

      <EuiFlexGroup>
        <EuiFlexItem>
          <div>
            {typeof active === 'boolean' ? (
              <EuiBadge color="#BD271E" data-test-subj="page-title-active-badge">
                {label}
              </EuiBadge>
            ) : null}
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
