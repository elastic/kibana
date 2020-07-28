/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

export const MonitorStatusTitle = () => {
  return (
    <FormattedMessage
      id="xpack.uptime.alerts.monitorStatus.title.label"
      defaultMessage="Uptime monitor status"
    />
  );
};
