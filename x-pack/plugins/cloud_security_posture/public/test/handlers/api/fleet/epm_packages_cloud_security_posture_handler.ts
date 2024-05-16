/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http, HttpResponse } from 'msw';
import * as cloudSecurityPosture190Preview04 from './mocks/cloud_security_posture_190_preview04.json';

export const defaultEpmPackagesCloudSecurityPosture = http.get(
  'http://localhost/api/fleet/epm/packages/cloud_security_posture',
  () => {
    return HttpResponse.json(cloudSecurityPosture190Preview04);
  }
);
