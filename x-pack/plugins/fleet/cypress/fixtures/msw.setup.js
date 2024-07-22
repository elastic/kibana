/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupWorker } from 'msw/browser';
import { http, HttpResponse } from 'msw';

const handlers = [
  http.post('http://localhost.agentless.api/api/v1/ess', () => {
    return HttpResponse.json({
      data: {
        id: 'policy-id',
        region: 'us-east-1',
      },
      status: 200,
    });
  }),
];

export const worker = setupWorker(...handlers);
