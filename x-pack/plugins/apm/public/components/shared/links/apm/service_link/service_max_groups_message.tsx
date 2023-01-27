/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const OTHER_SERVICE_NAME = '_other';

export function ServiceMaxGroupsMessage({
  serviceOverflowCount = 0,
}: {
  serviceOverflowCount?: number;
}) {
  return (
    <FormattedMessage
      defaultMessage="Number of services that have been instrumented has reached the current max. capacity that can be handled by the APM server. There are at least {serviceOverflowCount, plural, one {1 service} other {# services}} missing in this list. Please increase the memory allocated to APM server."
      id="xpack.apm.serviceDetail.maxGroups.message"
      values={{
        serviceOverflowCount,
      }}
    />
  );
}
