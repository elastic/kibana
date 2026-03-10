/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { last } from 'lodash';
import pRetry from 'p-retry';

const DEFAULT_VERSION = '8.15.0-SNAPSHOT';

export async function getLatestVersion(): Promise<string> {
  return pRetry(() => axios('https://artifacts-api.elastic.co/v1/versions'), {
    maxRetryTime: 60 * 1000, // 1 minute
  })
    .then(
      (response) =>
        last((response.data.versions as string[]).filter((v) => v.includes('-SNAPSHOT'))) ||
        DEFAULT_VERSION
    )
    .catch(() => DEFAULT_VERSION);
}
