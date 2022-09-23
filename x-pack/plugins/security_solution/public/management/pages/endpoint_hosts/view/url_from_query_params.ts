/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';

import type { EndpointIndexUIQueryParams } from '../types';
import type { AppLocation } from '../../../../../common/endpoint/types';

export function urlFromQueryParams(queryParams: EndpointIndexUIQueryParams): Partial<AppLocation> {
  const search = querystring.stringify(queryParams as Record<string, string>);
  return {
    search,
  };
}
