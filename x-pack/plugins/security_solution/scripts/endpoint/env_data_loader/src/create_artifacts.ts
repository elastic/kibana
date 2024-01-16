/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ExecutionThrottler } from '../../common/execution_throttler';
import { EventFiltersGenerator } from '../../../../common/endpoint/data_generators/event_filters_generator';
import { TrustedAppGenerator } from '../../../../common/endpoint/data_generators/trusted_app_generator';
import { createEventFilter, createTrustedApp } from '../../common/endpoint_artifact_services';
import type { ReportProgressCallback } from './types';

interface ArtifactCreationOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  count: number;
  policyIds: string[];
  reportProgress: ReportProgressCallback;
  globalArtifactRatio: number;
  throttler: ExecutionThrottler;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loop = (count: number, callback: (instance: number) => any): void => {
  let done = 1;

  while (done <= count) {
    try {
      callback(done++);
    } catch {
      return;
    }
  }
};

export const createTrustedApps = async ({
  kbnClient,
  log,
  count,
  reportProgress,
  throttler,
}: ArtifactCreationOptions): Promise<void> => {
  const generator = new TrustedAppGenerator();
  let doneCount = 0;

  loop(count, () => {
    throttler.addToQueue(async () => {
      await createTrustedApp(
        kbnClient,
        generator.generateTrustedAppForCreate({
          effectScope: { type: 'global' },
        })
      ).finally(() => {
        doneCount++;
        reportProgress({ doneCount });
      });
    });
  });
};

export const createEventFilters = async ({
  kbnClient,
  log,
  count,
  reportProgress,
  throttler,
}: ArtifactCreationOptions): Promise<void> => {
  const eventGenerator = new EventFiltersGenerator();
  let doneCount = 0;

  loop(count, () => {
    throttler.addToQueue(async () => {
      await createEventFilter(kbnClient, eventGenerator.generateEventFilterForCreate()).finally(
        () => {
          doneCount++;
          reportProgress({ doneCount });
        }
      );
    });
  });
};

export const createBlocklists = async ({
  kbnClient,
  log,
  count,
  reportProgress,
}: ArtifactCreationOptions): Promise<void> => {};

export const createHostIsolationExceptions = async ({
  kbnClient,
  log,
  count,
  reportProgress,
}: ArtifactCreationOptions): Promise<void> => {};

export const createEndpointExceptions = async ({
  kbnClient,
  log,
  count,
  reportProgress,
}: ArtifactCreationOptions): Promise<void> => {};
