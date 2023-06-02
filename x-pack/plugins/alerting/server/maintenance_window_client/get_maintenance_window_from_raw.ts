/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MaintenanceWindowSOAttributes } from '../../common';
import { getMaintenanceWindowDateAndStatus } from './get_maintenance_window_date_and_status';

export interface GetMaintenanceWindowFromRawParams {
  id: string;
  attributes: MaintenanceWindowSOAttributes;
}

export const getMaintenanceWindowFromRaw = ({
  id,
  attributes,
}: GetMaintenanceWindowFromRawParams) => {
  const { events, expirationDate } = attributes;
  const { eventStartTime, eventEndTime, status } = getMaintenanceWindowDateAndStatus({
    events,
    expirationDate: new Date(expirationDate),
    dateToCompare: new Date(),
  });

  return {
    ...attributes,
    id,
    eventStartTime,
    eventEndTime,
    status,
  };
};
