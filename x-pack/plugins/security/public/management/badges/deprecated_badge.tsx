/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiBadge, EuiToolTipProps } from '@elastic/eui';
import { OptionalToolTip } from './optional_tooltip';

interface Props {
  'data-test-subj'?: string;
  tooltipContent?: EuiToolTipProps['content'];
}

export const DeprecatedBadge = (props: Props) => {
  return (
    <OptionalToolTip tooltipContent={props.tooltipContent}>
      <EuiBadge data-test-subj={props['data-test-subj']} color="warning">
        <FormattedMessage
          id="xpack.security.management.deprecatedBadge"
          defaultMessage="Deprecated"
        />
      </EuiBadge>
    </OptionalToolTip>
  );
};
