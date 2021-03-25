/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { euiStyled } from '../../../../../../../../../../src/plugins/kibana_react/common';
import { px, units } from '../../../../../../style/variables';

const SpanBadge = euiStyled(EuiBadge)`
  display: inline-block;
  margin-right: ${px(units.quarter)};
`;

export interface SyncBadgeProps {
  /**
   * Is the request synchronous? True will show blocking, false will show async.
   */
  sync?: boolean;
}

export function SyncBadge({ sync }: SyncBadgeProps) {
  switch (sync) {
    case true:
      return (
        <SpanBadge>
          {i18n.translate('xpack.apm.transactionDetails.syncBadgeBlocking', {
            defaultMessage: 'blocking',
          })}
        </SpanBadge>
      );
    case false:
      return (
        <SpanBadge>
          {i18n.translate('xpack.apm.transactionDetails.syncBadgeAsync', {
            defaultMessage: 'async',
          })}
        </SpanBadge>
      );
    default:
      return null;
  }
}
