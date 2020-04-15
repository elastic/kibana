/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import { EndpointAppLocation, HostIndexUIQueryParams } from '../../types';

export function urlFromQueryParams(
  queryParams: HostIndexUIQueryParams
): Partial<EndpointAppLocation> {
  const search = querystring.stringify(queryParams);
  return {
    search,
  };
}
