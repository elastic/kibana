/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiBadge } from '@elastic/eui';
import { statusCodes } from './statusCodes';
import { httpStatusCodeToColor } from '../../../../utils/httpStatusCodeToColor';

interface HttpStatusBadgeProps {
  status: number;
}
export function HttpStatusBadge({ status }: HttpStatusBadgeProps) {
  const label = i18n.translate('xpack.apm.transactionDetails.statusCode', {
    defaultMessage: 'Status code',
  });

  return (
    <EuiToolTip content={label}>
      <EuiBadge color={httpStatusCodeToColor(status) || 'default'}>
        {status} {statusCodes[status.toString()]}
      </EuiBadge>
    </EuiToolTip>
  );
}
