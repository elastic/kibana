/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KillProcessRequestBody,
  ResponseActionApiResponse,
} from '../../../../common/endpoint/types';
import { KibanaServices } from '../kibana';
import { KILL_PROCESS_ROUTE } from '../../../../common/endpoint/constants';

/** Isolates a Host running either elastic endpoint or fleet agent */
export const killProcess = async (
  params: KillProcessRequestBody
): Promise<ResponseActionApiResponse> => {
  return KibanaServices.get().http.post<ResponseActionApiResponse>(KILL_PROCESS_ROUTE, {
    body: JSON.stringify(params),
  });
};
