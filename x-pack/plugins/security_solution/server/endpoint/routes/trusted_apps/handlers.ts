/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'kibana/server';
import { GetTrustedAppsRequest } from '../../../../common/endpoint/types';
import { EndpointAppContext } from '../../types';

export const getTrustedAppsListRouteHandler = (
  endpointAppContext: EndpointAppContext
): RequestHandler<undefined, GetTrustedAppsRequest> => {
  return async (context, request, response) => {
    return response.customError({ statusCode: 501 });
  };
};
