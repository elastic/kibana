/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiToolTipProps } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { OptionalToolTip } from './optional_tooltip';

interface Props {
  'data-test-subj'?: string;
  tooltipContent?: EuiToolTipProps['content'];
}

export const ReservedBadge = (props: Props) => {
  return (
    <OptionalToolTip tooltipContent={props.tooltipContent}>
      <EuiBadge data-test-subj={props['data-test-subj']} color="primary">
        <FormattedMessage id="xpack.security.management.reservedBadge" defaultMessage="Reserved" />
      </EuiBadge>
    </OptionalToolTip>
  );
};
