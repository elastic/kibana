/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ACTION_LOG_ROUTE } from '../../../../common/endpoint/constants';
import { ActivityLog, EndpointActionLogRequestBody } from '../../../../common/endpoint/types';
import { KibanaServices } from '../kibana';

/**
 * Fetches activity log for a single or multiple agent ids
 */
export const getActivityLogResponse = async (
  params: EndpointActionLogRequestBody
): Promise<ActivityLog> => {
  return KibanaServices.get().http.post<ActivityLog>(ENDPOINT_ACTION_LOG_ROUTE, {
    body: JSON.stringify(params),
  });
};
