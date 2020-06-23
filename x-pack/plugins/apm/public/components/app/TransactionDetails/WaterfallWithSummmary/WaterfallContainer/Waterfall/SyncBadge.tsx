/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { px, units } from '../../../../../../style/variables';

const SpanBadge = (styled(EuiBadge)`
  display: inline-block;
  margin-right: ${px(units.quarter)};
` as unknown) as typeof EuiBadge;

interface SyncBadgeProps {
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
