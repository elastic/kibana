/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { BuildIntegrationApiRequest } from '../../../../../../common';
import { INTEGRATION_BUILDER_PATH } from '../../../../../../common';
import { FLEET_PACKAGES_PATH } from '../../../../../../common/constants';

export const runBuildIntegration = async (
  body: BuildIntegrationApiRequest,
  { http, abortSignal }: { http: HttpSetup; abortSignal: AbortSignal }
): Promise<Blob> =>
  http.post<Blob>(INTEGRATION_BUILDER_PATH, {
    body: JSON.stringify(body),
    signal: abortSignal,
  });

export const runInstallPackage = async (
  zipFile: Blob,
  { http, abortSignal }: { http: HttpSetup; abortSignal: AbortSignal }
): Promise<object> =>
  http.post<object>(FLEET_PACKAGES_PATH, {
    headers: {
      Accept: 'application/zip',
      'Content-Type': 'application/zip',
      'Elastic-Api-Version': '2023-10-31',
    },
    body: zipFile,
    signal: abortSignal,
  });

export const getInstalledPackage = async ({
  http,
  abortSignal,
}: {
  http: HttpSetup;
  abortSignal: AbortSignal;
}): Promise<object> =>
  http.get<object>(FLEET_PACKAGES_PATH, {
    headers: {
      'Elastic-Api-Version': '2023-10-31',
    },
    signal: abortSignal,
  });
