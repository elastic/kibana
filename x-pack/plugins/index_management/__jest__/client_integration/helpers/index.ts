/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './mocks';

export type { TestBed } from '@kbn/test-jest-helpers';
export { nextTick, getRandomString, findTestSubject } from '@kbn/test-jest-helpers';

export {
  setupEnvironment,
  WithAppDependencies,
  services,
  kibanaVersion,
} from './setup_environment';

export type { TestSubjects } from './test_subjects';

export * from './fixtures';
