/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './options';
import { JobParamsProvider } from './job_params_provider';
import { metadata } from '../metadata';

export function register(registry) {
  registry.register({
    ...metadata,
    JobParamsProvider,
    optionsTemplate: `<pdf-options />`
  });
}
