/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { stringify } from '../../../../server/endpoint/utils/stringify';
import { EndpointExceptionsGenerator } from '../../../../common/endpoint/data_generators/endpoint_exceptions_generator';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts';
import { ExceptionsListItemGenerator } from '../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import type { ExecutionThrottler } from '../../common/execution_throttler';
import { EventFiltersGenerator } from '../../../../common/endpoint/data_generators/event_filters_generator';
import { TrustedAppGenerator } from '../../../../common/endpoint/data_generators/trusted_app_generator';
import {
  createBlocklist,
  createEventFilter,
  createHostIsolationException,
  createTrustedApp,
} from '../../common/endpoint_artifact_services';
import type { ReportProgressCallback } from './types';
import { loop } from './utils';

interface ArtifactCreationOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  count: number;
  policyIds: string[];
  reportProgress: ReportProgressCallback;
  globalArtifactRatio: number;
  throttler: ExecutionThrottler;
}

const logError = (log: ToolingLog, artifactType: string, error: Error) => {
  log.error(`[${artifactType}] error: ${error.message}`);
  log.verbose(stringify(error));
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
  let errorCount = 0;

  loop(count, () => {
    throttler.addToQueue(async () => {
      await createTrustedApp(
        kbnClient,
        generator.generateTrustedAppForCreate({
          effectScope: { type: 'global' },
        })
      )
        .catch((e) => {
          errorCount++;
          logError(log, 'Trusted Application', e);
        })
        .finally(() => {
          doneCount++;
          reportProgress({ doneCount, errorCount });
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
  let errorCount = 0;

  loop(count, () => {
    throttler.addToQueue(async () => {
      await createEventFilter(kbnClient, eventGenerator.generateEventFilterForCreate())
        .catch((e) => {
          errorCount++;
          logError(log, 'Event Filter', e);
        })
        .finally(() => {
          doneCount++;
          reportProgress({ doneCount, errorCount });
        });
    });
  });
};

export const createBlocklists = async ({
  kbnClient,
  log,
  count,
  reportProgress,
  throttler,
}: ArtifactCreationOptions): Promise<void> => {
  const generate = new ExceptionsListItemGenerator();
  let doneCount = 0;
  let errorCount = 0;

  loop(count, () => {
    throttler.addToQueue(async () => {
      await createBlocklist(
        kbnClient,
        generate.generateBlocklistForCreate({ tags: [GLOBAL_ARTIFACT_TAG] })
      )
        .catch((e) => {
          errorCount++;
          logError(log, 'BLocklist', e);
        })
        .finally(() => {
          doneCount++;
          reportProgress({ doneCount, errorCount });
        });
    });
  });
};

export const createHostIsolationExceptions = async ({
  kbnClient,
  log,
  count,
  reportProgress,
  throttler,
}: ArtifactCreationOptions): Promise<void> => {
  const generate = new ExceptionsListItemGenerator();
  let doneCount = 0;
  let errorCount = 0;

  loop(count, () => {
    throttler.addToQueue(async () => {
      await createHostIsolationException(
        kbnClient,
        generate.generateHostIsolationExceptionForCreate({ tags: [GLOBAL_ARTIFACT_TAG] })
      )
        .catch((e) => {
          errorCount++;
          logError(log, 'Host Isolation Exception', e);
        })
        .finally(() => {
          doneCount++;
          reportProgress({ doneCount, errorCount });
        });
    });
  });
};

export const createEndpointExceptions = async ({
  kbnClient,
  log,
  count,
  reportProgress,
  throttler,
}: ArtifactCreationOptions): Promise<void> => {
  const generate = new EndpointExceptionsGenerator();
  let doneCount = 0;
  let errorCount = 0;

  loop(count, () => {
    throttler.addToQueue(async () => {
      await createHostIsolationException(kbnClient, generate.generateEndpointExceptionForCreate())
        .catch((e) => {
          errorCount++;
          logError(log, 'Endpoint Exception', e);
        })
        .finally(() => {
          doneCount++;
          reportProgress({ doneCount, errorCount });
        });
    });
  });
};
