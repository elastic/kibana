/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  size: number;
}

export function SpanLinksBadge({ size }: Props) {
  return (
    <EuiToolTip title="Title" content="content">
      <EuiBadge>
        {i18n.translate('xpack.apm.waterfall.spanLinks.badge', {
          defaultMessage:
            '{size} {size, plural, one {Span link} other {Span Links}}',
          values: { size },
        })}
      </EuiBadge>
    </EuiToolTip>
  );
}
