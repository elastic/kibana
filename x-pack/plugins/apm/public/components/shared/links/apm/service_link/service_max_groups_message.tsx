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
      defaultMessage="The APM server has reached the current maximum number of instrumented service metric groups that it can handle. There {serviceOverflowCount, plural, one {is} other {are}} at least {serviceOverflowCount, plural, one {1 service metric group} other {# service metric groups}} bucketed under a common bucket at the top of this list."
      id="xpack.apm.serviceDetail.maxGroups.message"
      values={{
        serviceOverflowCount,
      }}
    />
  );
}
