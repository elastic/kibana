/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import {
  PingStatusesResponse,
  PingStatusesResponseType,
} from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service';

export const fetchMonitorPingStatuses = async ({
  monitorId,
  locationId,
  from,
  to,
  size,
}: {
  monitorId: string;
  locationId: string;
  from: string;
  to: string;
  size: number;
}): Promise<PingStatusesResponse> => {
  const locations = JSON.stringify([locationId]);
  const sort = 'desc';

  return await apiService.get(
    SYNTHETICS_API_URLS.PING_STATUSES,
    { monitorId, from, to, locations, sort, size },
    PingStatusesResponseType
  );
};
