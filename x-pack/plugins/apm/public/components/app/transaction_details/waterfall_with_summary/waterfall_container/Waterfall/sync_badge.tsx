/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

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
        <EuiBadge>
          {i18n.translate('xpack.apm.transactionDetails.syncBadgeBlocking', {
            defaultMessage: 'blocking',
          })}
        </EuiBadge>
      );
    case false:
      return (
        <EuiBadge>
          {i18n.translate('xpack.apm.transactionDetails.syncBadgeAsync', {
            defaultMessage: 'async',
          })}
        </EuiBadge>
      );
    default:
      return null;
  }
}
