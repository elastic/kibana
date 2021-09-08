/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTheme } from '../../../../../../hooks/use_theme';

export function FailureBadge({ outcome }: { outcome?: 'success' | 'failure' }) {
  const theme = useTheme();

  if (outcome !== 'failure') {
    return null;
  }

  return (
    <EuiToolTip
      content={i18n.translate('xpack.apm.failure_badge.tooltip', {
        defaultMessage: 'event.outcome = failure',
      })}
    >
      <EuiBadge color={theme.eui.euiColorDanger}>failure</EuiBadge>
    </EuiToolTip>
  );
}
