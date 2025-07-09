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
import { ObltPageObjects } from '../page_objects';
import { AnnotationsDataFixture, SloDataFixture } from './worker';

export interface ObltTestFixtures extends ScoutTestFixtures {
  pageObjects: ObltPageObjects;
}

export type ObltApiServicesFixture = ApiServicesFixture;

export interface ObltWorkerFixtures extends ScoutWorkerFixtures {
  apiServices: ObltApiServicesFixture;
  sloData: SloDataFixture;
  annotationsData: AnnotationsDataFixture;
}

export interface ObltParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: ObltPageObjects;
}

export interface ObltParallelWorkerFixtures extends ScoutParallelWorkerFixtures {
  apiServices: ObltApiServicesFixture;
}
