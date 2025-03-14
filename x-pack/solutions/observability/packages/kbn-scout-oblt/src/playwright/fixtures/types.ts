/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ScoutParallelTestFixtures,
  ScoutParallelWorkerFixtures,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout';
import { ObltPageObjects } from '../page_objects';

export interface ObltTestFixtures extends ScoutTestFixtures {
  pageObjects: ObltPageObjects;
}

export type ObltWorkerFixtures = ScoutWorkerFixtures;

export interface ObltParallelTestFixtures extends ScoutParallelTestFixtures {
  pageObjects: ObltPageObjects;
}

export type ObltParallelWorkerFixtures = ScoutParallelWorkerFixtures;
