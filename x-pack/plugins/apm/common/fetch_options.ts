/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchOptions } from 'kibana/public';

export type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  pathname: string;
  isCachable?: boolean;
  method?: string;
  body?: any;
};
