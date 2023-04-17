/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const OTHER_SERVICE_NAME = '_other';

export function ServiceMaxGroupsMessage() {
  return (
    <FormattedMessage
      defaultMessage="The APM server has reached the maximum capacity that it can currently handle in terms of showing individual services. Please consider scaling-up your APM server capacity and/or tuning the application instrumentation in order to view all of the data."
      id="xpack.apm.serviceDetail.maxGroup.message"
    />
  );
}
