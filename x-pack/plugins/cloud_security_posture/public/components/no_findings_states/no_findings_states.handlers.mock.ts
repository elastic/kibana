/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http, HttpResponse } from 'msw';

export const fleetCspPackageHandler = http.get(
  `/api/fleet/epm/packages/cloud_security_posture`,
  () => {
    return HttpResponse.json({
      item: {
        name: 'cloud_security_posture',
        version: '1.9.0',
      },
    });
  }
);
