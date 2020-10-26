/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Service for managing job saved objects

import { HttpService } from '../http_service';

import { basePath } from './index';

export const savedObjectsApiProvider = (httpService: HttpService) => ({
  jobsSpaces() {
    return httpService.http<any>({
      path: `${basePath()}/saved_objects/jobs_spaces`,
      method: 'GET',
    });
  },
});
