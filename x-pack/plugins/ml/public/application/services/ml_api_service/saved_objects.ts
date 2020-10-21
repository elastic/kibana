/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Service for querying filters, which hold lists of entities,
// for example a list of known safe URL domains.

import { http } from '../http_service';

import { basePath } from './index';

export const savedObjects = {
  jobsSpaces() {
    return http<any>({
      path: `${basePath()}/saved_objects/jobs_spaces`,
      method: 'GET',
    });
  },
};
