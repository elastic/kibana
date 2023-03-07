/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format } from './get_monitor_url';

export const getSyntheticsMonitorRouteFromMonitorId = ({
  configId,
  dateRangeStart,
  dateRangeEnd,
  locationId,
}: {
  configId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  locationId: string;
}) =>
  format({
    pathname: `/app/synthetics/monitor/${configId}/history`,
    query: {
      dateRangeEnd,
      dateRangeStart,
      locationId,
    },
  });
