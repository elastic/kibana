/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HostIsolationRequestBody,
  HostIsolationResponse,
  EndpointResponseActionRequestBody,
  EndpointResponseActionResponse,
} from '../../../../common/endpoint/types';
import { KibanaServices } from '../kibana';
import {
  ISOLATE_HOST_ROUTE,
  UNISOLATE_HOST_ROUTE,
  ENDPOINT_RESPONSE_ACTION_ROUTE,
} from '../../../../common/endpoint/constants';

/** Isolates a Host running either elastic endpoint or fleet agent */
export const isolateHost = async (
  params: HostIsolationRequestBody
): Promise<HostIsolationResponse> => {
  return KibanaServices.get().http.post<HostIsolationResponse>(ISOLATE_HOST_ROUTE, {
    body: JSON.stringify(params),
  });
};

/** Un-isolates a Host running either elastic endpoint or fleet agent */
export const unIsolateHost = async (
  params: HostIsolationRequestBody
): Promise<HostIsolationResponse> => {
  return KibanaServices.get().http.post<HostIsolationResponse>(UNISOLATE_HOST_ROUTE, {
    body: JSON.stringify(params),
  });
};

/** Executes an Endpoint Response action */
export const endpointResponseAction = async (
  params: EndpointResponseActionRequestBody
): Promise<EndpointResponseActionResponse> => {
  return KibanaServices.get().http.post<EndpointResponseActionResponse>(
    ENDPOINT_RESPONSE_ACTION_ROUTE,
    {
      body: JSON.stringify(params),
    }
  );
};
