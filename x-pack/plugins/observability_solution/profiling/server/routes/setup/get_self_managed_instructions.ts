/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SetupDataCollectionInstructions } from './get_cloud_setup_instructions';

export function getSelfManagedInstructions({
  stackVersion,
}: {
  stackVersion: string;
}): SetupDataCollectionInstructions {
  return {
    collector: { host: '<Collector endpoint>', secretToken: '<Collector secret token>' },
    profilerAgent: { version: '<Profiler agent version>' },
    symbolizer: { host: '<Symbolizer URL>' },
    stackVersion,
  };
}
