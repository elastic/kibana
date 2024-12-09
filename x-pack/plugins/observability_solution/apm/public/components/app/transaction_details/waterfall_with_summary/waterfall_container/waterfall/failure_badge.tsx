/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { EventOutcome } from '../../../../../../../typings/es_schemas/raw/fields/event_outcome';

const ResetLineHeight = euiStyled.span`
  line-height: initial;
`;

export function FailureBadge({ outcome }: { outcome?: EventOutcome }) {
  const { euiTheme } = useEuiTheme();

  if (outcome !== 'failure') {
    return null;
  }

  return (
    <ResetLineHeight>
      <EuiToolTip
        content={i18n.translate('xpack.apm.failure_badge.tooltip', {
          defaultMessage: 'event.outcome = failure',
        })}
      >
        <EuiBadge color={euiTheme.colors.danger}>
          {i18n.translate('xpack.apm.failureBadge.failureBadgeLabel', {
            defaultMessage: 'failure',
          })}
        </EuiBadge>
      </EuiToolTip>
    </ResetLineHeight>
  );
}
