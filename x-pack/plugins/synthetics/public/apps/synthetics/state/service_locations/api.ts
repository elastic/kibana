/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '../../../../../common/constants';
import {
  ServiceLocations,
  ServiceLocationsApiResponseCodec,
  ThrottlingOptions,
} from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service';

export const fetchServiceLocations = async (): Promise<{
  throttling: ThrottlingOptions | undefined;
  locations: ServiceLocations;
}> => {
  const { throttling, locations } = await apiService.get(
    API_URLS.SERVICE_LOCATIONS,
    undefined,
    ServiceLocationsApiResponseCodec
  );
  return { throttling, locations };
};
