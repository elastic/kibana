/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function ColdStartBadge() {
  return (
    <EuiBadge color="warning">
      {i18n.translate('xpack.apm.transactionDetails.coldstartBadge', {
        defaultMessage: 'cold start',
      })}
    </EuiBadge>
  );
}
