/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { useFetchActiveAlerts } from '../hooks/use_fetch_active_alerts';

export const MonitorAlertsIcon = () => {
  const { numberOfAlerts } = useFetchActiveAlerts();

  return numberOfAlerts > 0 ? <EuiBadge color="danger">{numberOfAlerts}</EuiBadge> : null;
};
