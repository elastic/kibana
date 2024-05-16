/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http, HttpResponse } from 'msw';
import * as vulnerabilitiesJson from './mocks/vulnerabilities.json';

export const bsearchVulnerabilitiesPageDefault = http.post(
  'http://localhost/internal/bsearch',
  () => {
    return HttpResponse.json(vulnerabilitiesJson);
  }
);
