/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupRouteService, fleetSetupRouteService } from '../../services';
import type { GetFleetStatusResponse } from '../../types';
import { API_VERSIONS } from '../../../common/constants';

import { sendRequest } from './use_request';

export const sendSetup = () => {
  return sendRequest({
    path: setupRouteService.getSetupPath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
  });
};

export const sendGetFleetStatus = () => {
  return sendRequest<GetFleetStatusResponse>({
    path: fleetSetupRouteService.getFleetSetupPath(),
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
};

export const sendPostFleetSetup = ({ forceRecreate }: { forceRecreate: boolean }) => {
  return sendRequest({
    method: 'post',
    path: fleetSetupRouteService.postFleetSetupPath(),
    version: API_VERSIONS.public.v1,
    body: {
      forceRecreate,
    },
  });
};
