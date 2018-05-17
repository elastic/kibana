/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createJobFactory } from './create_job';
import { executeJobFactory } from './execute_job';
import { metadata } from '../metadata';

export function register(registry) {
  registry.register({
    ...metadata,
    jobType: 'csv',
    jobContentExtension: 'csv',
    createJobFactory,
    executeJobFactory,
    validLicenses: ['trial', 'basic', 'standard', 'gold', 'platinum'],
  });
}
