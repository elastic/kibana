/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook as baseGlobalSetupHook, mergeTests } from '@kbn/scout';
import { profilingSetupFixture } from '../fixtures/worker/profiling/profiling_setup_fixture';
import { sloDataFixture } from '../fixtures/worker';

// Create a custom global setup hook that includes profiling / slo setup
export const globalSetupHook = mergeTests(
  baseGlobalSetupHook,
  profilingSetupFixture,
  sloDataFixture
);
