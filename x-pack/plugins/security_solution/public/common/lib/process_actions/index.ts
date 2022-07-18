/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KillOrSuspendProcessRequestBody,
  ResponseActionApiResponse,
} from '../../../../common/endpoint/types';
import { KibanaServices } from '../kibana';
import { KILL_PROCESS_ROUTE, SUSPEND_PROCESS_ROUTE } from '../../../../common/endpoint/constants';

/** Kills a process specified by pid or entity id on a host running Endpoint Security */
export const killProcess = (
  params: KillOrSuspendProcessRequestBody
): Promise<ResponseActionApiResponse> => {
  return KibanaServices.get().http.post<ResponseActionApiResponse>(KILL_PROCESS_ROUTE, {
    body: JSON.stringify(params),
  });
};

/** Suspends a process specified by pid or entity id on a host running Endpoint Security */
export const suspendProcess = (
  params: KillOrSuspendProcessRequestBody
): Promise<ResponseActionApiResponse> => {
  return KibanaServices.get().http.post<ResponseActionApiResponse>(SUSPEND_PROCESS_ROUTE, {
    body: JSON.stringify(params),
  });
};
