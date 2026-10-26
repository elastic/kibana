/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiBadge, useEuiTheme } from '@elastic/eui';

interface Props {
  count: number;
}

export interface ErrorCountBadgeDescriptor {
  label: string;
  color: string;
}

/** Resolves the error count badge's label and color. */
export function getErrorCountBadgeDescriptor(
  count: number,
  euiTheme: EuiThemeComputed
): ErrorCountBadgeDescriptor {
  return {
    label: i18n.translate('xpack.apm.transactionDetails.errorCount', {
      defaultMessage: '{errorCount, number} {errorCount, plural, one {Error} other {Errors}}',
      values: { errorCount: count },
    }),
    color: euiTheme.colors.danger,
  };
}

export function ErrorCountSummaryItemBadge({ count }: Props) {
  const { euiTheme } = useEuiTheme();
  const { label, color } = getErrorCountBadgeDescriptor(count, euiTheme);

  return (
    <EuiBadge color={color} style={{ maxWidth: '200px' }}>
      {label}
    </EuiBadge>
  );
}
