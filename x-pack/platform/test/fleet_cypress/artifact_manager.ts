/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { retryForSuccess } from '@kbn/ftr-common-functional-services';

const DEFAULT_VERSION = '8.15.0-SNAPSHOT';
const name = 'Artifact Manager - getLatestVersion';

export async function getLatestVersion(): Promise<string> {
  return retryForSuccess(
    new ToolingLog({ level: 'debug', writeTo: process.stdout }, { context: name }),
    {
      timeout: 60_000,
      methodName: name,
      retryCount: 20,
      block: async () => {
        const response = await fetch('https://artifacts-api.elastic.co/v1/versions');
        if (!response.ok) {
          throw new Error(`Failed to fetch versions: ${response.status} ${response.statusText}`);
        }
        return response.json();
      },
    }
  )
    .then(
      (data) =>
        last((data.versions as string[]).filter((v) => v.includes('-SNAPSHOT'))) || DEFAULT_VERSION
    )
    .catch(() => DEFAULT_VERSION);
}
