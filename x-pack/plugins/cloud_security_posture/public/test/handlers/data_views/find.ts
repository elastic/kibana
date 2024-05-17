/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http, HttpResponse } from 'msw';
import * as vulnerabilitiesLatestJson from './mocks/logs_cloud_security_posture.vulnerabilities_latest.json';
import * as findingsLatestJson from './mocks/logs_cloud_security_posture.findings_latest.json';

export const defaultDataViewFindHandler = http.get(
  'http://localhost/internal/data_views/fields',
  ({ request }) => {
    const url = new URL(request.url);
    const pattern = url.searchParams.get('pattern');

    if (pattern === 'logs-cloud_security_posture.findings_latest-*') {
      return HttpResponse.json(findingsLatestJson);
    }

    if (pattern === 'logs-cloud_security_posture.vulnerabilities_latest*') {
      return HttpResponse.json(vulnerabilitiesLatestJson);
    }

    return HttpResponse.json({
      fields: [],
      indices: [],
    });
  }
);
