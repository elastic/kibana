/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiServicesFixture,
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import type { ObltPageObjects } from '../page_objects';
import type { SloDataFixture, ProfilingSetupFixture } from './worker';

export interface ObltTestFixtures extends ScoutTestFixtures {
  pageObjects: ObltPageObjects;
}

export type ObltApiServicesFixture = ApiServicesFixture;

export interface ObltWorkerFixtures extends ScoutWorkerFixtures {
  apiServices: ObltApiServicesFixture;
  sloData: SloDataFixture;
  profilingSetup: ProfilingSetupFixture;
}

export interface ObltParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: ObltPageObjects;
}

export interface ObltParallelWorkerFixtures extends ScoutParallelWorkerFixtures {
  apiServices: ObltApiServicesFixture;
  profilingSetup: ProfilingSetupFixture;
}
