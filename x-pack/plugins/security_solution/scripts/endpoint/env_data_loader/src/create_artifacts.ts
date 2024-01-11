/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { TrustedAppGenerator } from '../../../../common/endpoint/data_generators/trusted_app_generator';
import { createTrustedApp } from '../../common/endpoint_artifact_services';
import type { ReportProgressCallback } from './types';

interface ArtifactCreationOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  count: number;
  reportProgress: ReportProgressCallback;
}

export const createTrustedApps = async ({
  kbnClient,
  log,
  count,
  reportProgress,
}: ArtifactCreationOptions) => {
  const generator = new TrustedAppGenerator();
  let doneCount = 0;

  while (doneCount < count) {
    await createTrustedApp(
      kbnClient,
      generator.generateTrustedAppForCreate({
        effectScope: { type: 'global' },
      })
    );
    doneCount++;
    reportProgress({ doneCount });
  }
};
