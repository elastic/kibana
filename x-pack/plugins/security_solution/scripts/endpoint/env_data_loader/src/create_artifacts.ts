/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { BaseDataGenerator } from '../../../../common/endpoint/data_generators/base_data_generator';
import type { NewTrustedApp } from '../../../../common/endpoint/types';
import { stringify } from '../../../../server/endpoint/utils/stringify';
import { EndpointExceptionsGenerator } from '../../../../common/endpoint/data_generators/endpoint_exceptions_generator';
import {
  BY_POLICY_ARTIFACT_TAG_PREFIX,
  GLOBAL_ARTIFACT_TAG,
} from '../../../../common/endpoint/service/artifacts';
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

// Class instance that exposes protected methods for use locally in this module
const gen = new (class extends BaseDataGenerator {
  public randomArray<T>(lengthLimit: number, generator: () => T): T[] {
    return super.randomArray(lengthLimit, generator);
  }

  public randomChoice<T>(choices: T[] | readonly T[]): T {
    return super.randomChoice(choices);
  }
})();

const generatePerPolicyEffectiveScope = (policyIds: string[]): string[] => {
  return gen.randomArray(
    gen.randomN(Math.min(100, policyIds.length)),
    () => `${BY_POLICY_ARTIFACT_TAG_PREFIX}${gen.randomChoice(policyIds)}`
  );
};

const logError = (log: ToolingLog, artifactType: string, error: Error) => {
  log.error(`[${artifactType}] error: ${error.message}`);
  log.verbose(stringify(error));
};

const calculateGlobalAndPerPolicyCounts = (
  total: number,
  globalRatio: number
): { global: number; perPolicy: number } => {
  const response = {
    global: 0,
    perPolicy: 0,
  };

  response.global = Math.floor(total * (globalRatio / 100));

  // If a ratio was defined, then ensure at least one is created
  if (globalRatio > 0 && response.global === 0) {
    response.global = 1;
  }

  response.perPolicy = total - response.global;

  return response;
};

export const createTrustedApps = async ({
  kbnClient,
  log,
  count,
  reportProgress,
  throttler,
  globalArtifactRatio,
  policyIds,
}: ArtifactCreationOptions): Promise<void> => {
  const generator = new TrustedAppGenerator();
  const { global: globalCount, perPolicy } = calculateGlobalAndPerPolicyCounts(
    count,
    globalArtifactRatio
  );
  let globalDone = 0;
  let doneCount = 0;
  let errorCount = 0;

  log.info(`Trusted Apps: Creating ${globalCount} global and ${perPolicy} per-policy artifacts`);

  loop(count, () => {
    throttler.addToQueue(async () => {
      let effectScope: NewTrustedApp['effectScope'] = { type: 'global' };

      if (globalDone < globalCount) {
        globalDone++;
      } else {
        effectScope = {
          type: 'policy',
          policies: gen.randomArray(gen.randomN(Math.min(100, policyIds.length)), () =>
            gen.randomChoice(policyIds)
          ),
        };
      }

      await createTrustedApp(
        kbnClient,
        generator.generateTrustedAppForCreate({
          effectScope,
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
  globalArtifactRatio,
  policyIds,
}: ArtifactCreationOptions): Promise<void> => {
  const eventGenerator = new EventFiltersGenerator();
  const { global: globalCount, perPolicy } = calculateGlobalAndPerPolicyCounts(
    count,
    globalArtifactRatio
  );
  let globalDone = 0;
  let doneCount = 0;
  let errorCount = 0;

  log.info(`Event Filters: Creating ${globalCount} global and ${perPolicy} per-policy artifacts`);

  loop(count, () => {
    throttler.addToQueue(async () => {
      let tags = [GLOBAL_ARTIFACT_TAG];

      if (globalDone < globalCount) {
        globalDone++;
      } else {
        tags = generatePerPolicyEffectiveScope(policyIds);
      }

      await createEventFilter(kbnClient, eventGenerator.generateEventFilterForCreate({ tags }))
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
  policyIds,
  globalArtifactRatio,
}: ArtifactCreationOptions): Promise<void> => {
  const generate = new ExceptionsListItemGenerator();
  const { global: globalCount, perPolicy } = calculateGlobalAndPerPolicyCounts(
    count,
    globalArtifactRatio
  );
  let globalDone = 0;
  let doneCount = 0;
  let errorCount = 0;

  log.info(`Blocklists: Creating ${globalCount} global and ${perPolicy} per-policy artifacts`);

  loop(count, () => {
    throttler.addToQueue(async () => {
      let tags = [GLOBAL_ARTIFACT_TAG];

      if (globalDone < globalCount) {
        globalDone++;
      } else {
        tags = generatePerPolicyEffectiveScope(policyIds);
      }

      await createBlocklist(kbnClient, generate.generateBlocklistForCreate({ tags }))
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
  globalArtifactRatio,
  policyIds,
}: ArtifactCreationOptions): Promise<void> => {
  const generate = new ExceptionsListItemGenerator();
  const { global: globalCount, perPolicy } = calculateGlobalAndPerPolicyCounts(
    count,
    globalArtifactRatio
  );
  let globalDone = 0;
  let doneCount = 0;
  let errorCount = 0;

  log.info(
    `Host Isolation Exceptions: Creating ${globalCount} global and ${perPolicy} per-policy artifacts`
  );

  loop(count, () => {
    throttler.addToQueue(async () => {
      let tags = [GLOBAL_ARTIFACT_TAG];

      if (globalDone < globalCount) {
        globalDone++;
      } else {
        tags = generatePerPolicyEffectiveScope(policyIds);
      }

      await createHostIsolationException(
        kbnClient,
        generate.generateHostIsolationExceptionForCreate({ tags })
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
