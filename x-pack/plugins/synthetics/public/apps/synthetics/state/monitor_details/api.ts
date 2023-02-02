/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/types';
import moment from 'moment';
import { apiService } from '../../../../utils/api_service';
import {
  EncryptedSyntheticsSavedMonitor,
  PingsResponse,
  PingsResponseType,
  SyntheticsMonitor,
} from '../../../../../common/runtime_types';
import { API_URLS, SYNTHETICS_API_URLS } from '../../../../../common/constants';

export const fetchMonitorLastRun = async ({
  monitorId,
  locationId,
}: {
  monitorId: string;
  locationId: string;
}): Promise<PingsResponse> => {
  return fetchMonitorRecentPings({ monitorId, locationId, size: 1 });
};

export const fetchMonitorRecentPings = async ({
  monitorId,
  locationId,
  from,
  to,
  size = 10,
  pageIndex = 0,
}: {
  monitorId: string;
  locationId: string;
  from?: string;
  to?: string;
  size?: number;
  pageIndex?: number;
}): Promise<PingsResponse> => {
  const locations = JSON.stringify([locationId]);
  const sort = 'desc';

  return await apiService.get(
    SYNTHETICS_API_URLS.PINGS,
    {
      monitorId,
      from: from ?? moment().subtract(30, 'days').toISOString(),
      to: to ?? new Date().toISOString(),
      locations,
      sort,
      size,
      pageIndex,
    },
    PingsResponseType
  );
};

export const fetchSyntheticsMonitor = async ({
  monitorId,
}: {
  monitorId: string;
}): Promise<EncryptedSyntheticsSavedMonitor> => {
  const savedObject = (await apiService.get(
    `${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`
  )) as SavedObject<SyntheticsMonitor>;

  return {
    ...savedObject.attributes,
    updated_at: savedObject.updated_at,
    created_at: savedObject.created_at,
  } as EncryptedSyntheticsSavedMonitor;
};
