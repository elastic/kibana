/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import { pendingSimpleAlertCreationSelector } from '../state/selectors';

export const useMonitorWithInFlightAlert = (monitorId: string): boolean => {
  const monitorsWithInFlightRequests = useSelector(pendingSimpleAlertCreationSelector);

  return monitorsWithInFlightRequests.some((f) => f.monitorId === monitorId);
};
