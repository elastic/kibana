/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, useEuiTheme } from '@elastic/eui';

interface Props {
  count: number;
}

export function ErrorCountSummaryItemBadge({ count }: Props) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBadge color={euiTheme.colors.danger} style={{ maxWidth: '200px' }}>
      {i18n.translate('xpack.apm.transactionDetails.errorCount', {
        defaultMessage: '{errorCount, number} {errorCount, plural, one {Error} other {Errors}}',
        values: { errorCount: count },
      })}
    </EuiBadge>
  );
}
