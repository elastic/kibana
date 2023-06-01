/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertest from 'supertest';
import { format, UrlObject } from 'url';
import {
  ApmUsername,
  APM_TEST_PASSWORD,
} from '../create_apm_users/authentication';
import { createApmApiClient } from './create_apm_api_client';

export async function getApmApiClient({
  kibanaServer,
  username,
}: {
  kibanaServer: UrlObject;
  username: ApmUsername;
}) {
  const url = format({
    ...kibanaServer,
    auth: `${username}:${APM_TEST_PASSWORD}`,
  });

  return createApmApiClient(supertest(url));
}
