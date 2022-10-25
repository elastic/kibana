/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/types';
import { apiService } from '../../../../utils/api_service';
import {
  EncryptedSyntheticsSavedMonitor,
  PingsResponse,
  PingsResponseType,
  SyntheticsMonitor,
} from '../../../../../common/runtime_types';
import { API_URLS, SYNTHETICS_API_URLS } from '../../../../../common/constants';

export interface QueryParams {
  monitorId: string;
  dateStart: string;
  dateEnd: string;
}

export const fetchMonitorRecentPings = async ({
  monitorId,
  locationId,
  size = 10,
}: {
  monitorId: string;
  locationId: string;
  size?: number;
}): Promise<PingsResponse> => {
  const from = new Date(0).toISOString();
  const to = new Date().toISOString();
  const locations = JSON.stringify([locationId]);
  const sort = 'desc';

  return await apiService.get(
    SYNTHETICS_API_URLS.PINGS,
    { monitorId, from, to, locations, sort, size },
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
    id: savedObject.id,
    updated_at: savedObject.updated_at,
  } as EncryptedSyntheticsSavedMonitor;
};
