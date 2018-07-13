/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { datafeedsProvider } from './datafeeds';
import { jobsProvider } from './jobs';

export function jobServiceProvider(callWithRequest) {
  return {
    ...datafeedsProvider(callWithRequest),
    ...jobsProvider(callWithRequest),
  };
}
