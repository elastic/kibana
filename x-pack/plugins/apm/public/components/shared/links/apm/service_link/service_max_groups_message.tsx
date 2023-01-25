/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const OTHER_SERVICE_NAME = '_other';

export const maxTransactionGroupsTitle = i18n.translate(
  'xpack.apm.transactionsCallout.maxTransactionGroups.title',
  {
    defaultMessage: 'The number of transaction groups has been reached.',
  }
);

export function ServiceMaxGroupsMessage({
  remainingServices,
}: {
  remainingServices: number;
}) {
  return (
    <FormattedMessage
      defaultMessage="Number of services that have been instrumented has reached the current max. capacity that can be handled by the APM server. There are at least {remainingServices, plural, one {1 service} other {# services}} missing in this list. Please increase the memory allocated to APM server."
      id="xpack.apm.transactionDetail.maxGroups.message"
      values={{
        remainingServices,
      }}
    />
  );
}
