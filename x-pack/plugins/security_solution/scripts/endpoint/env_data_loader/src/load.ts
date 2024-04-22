/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { fetchAllEndpointIntegrationPolicyListIds } from '../../common/fleet_services';
import { ExecutionThrottler } from '../../common/execution_throttler';
import {
  createBlocklists,
  createEndpointExceptions,
  createEventFilters,
  createHostIsolationExceptions,
  createTrustedApps,
} from './create_artifacts';
import { installOrUpgradeEndpointFleetPackage } from '../../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { ProgressReporter } from './progress_reporter';
import type { ProgressReporterInterface } from './types';
import { createPolicies } from './create_policies';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';

interface LoadOptions {
  kbnClient: KbnClient;
  log?: ToolingLog;
  policyCount: number;
  trustedAppsCount: number;
  eventFiltersCount: number;
  blocklistsCount: number;
  hostIsolationExceptionsCount: number;
  endpointExceptionsCount: number;
  globalArtifactRatio: number;
  concurrency: number;
}

export const load = async ({
  kbnClient,
  log = createToolingLogger(),
  policyCount,
  trustedAppsCount,
  eventFiltersCount,
  blocklistsCount,
  hostIsolationExceptionsCount,
  endpointExceptionsCount,
  globalArtifactRatio,
  concurrency,
}: LoadOptions) => {
  const throttler = new ExecutionThrottler({ log, concurrency });
  const reportProgress: ProgressReporterInterface = new ProgressReporter({
    reportStatus: (status) => {
      const now = new Date();

      log.info(`__
Status at: ${now.toString()}
${status}\nRequests pending: ${throttler.getStats().pending}

`);
    },
  });
  const policyReporter = reportProgress.addCategory('policies', policyCount);
  const trustedAppsReporter = reportProgress.addCategory('trusted apps', trustedAppsCount);
  const eventFiltersReporter = reportProgress.addCategory('event filters', eventFiltersCount);
  const blocklistsReporter = reportProgress.addCategory('blocklists', blocklistsCount);
  const hostIsolationExceptionsReporter = reportProgress.addCategory(
    'host isolation exceptions',
    hostIsolationExceptionsCount
  );
  const endpointExceptionsReporter = reportProgress.addCategory(
    'endpoint exceptions',
    endpointExceptionsCount
  );

  // Ensure fleet is setup with endpoint (which also creates the DS/Transforms, etc)
  await installOrUpgradeEndpointFleetPackage(kbnClient, log);

  const endpointPolicyIds = policyCount
    ? await createPolicies({
        kbnClient,
        log,
        count: policyCount,
        reportProgress: policyReporter,
        throttler,
      })
    : await fetchAllEndpointIntegrationPolicyListIds(kbnClient);

  log?.verbose(`Policy IDs:\n${endpointPolicyIds.join('\n')}`);

  await Promise.all([
    trustedAppsCount &&
      createTrustedApps({
        kbnClient,
        log,
        reportProgress: trustedAppsReporter,
        count: trustedAppsCount,
        policyIds: endpointPolicyIds,
        globalArtifactRatio,
        throttler,
      }),

    eventFiltersCount &&
      createEventFilters({
        kbnClient,
        log,
        reportProgress: eventFiltersReporter,
        count: eventFiltersCount,
        policyIds: endpointPolicyIds,
        globalArtifactRatio,
        throttler,
      }),

    blocklistsCount &&
      createBlocklists({
        kbnClient,
        log,
        reportProgress: blocklistsReporter,
        count: blocklistsCount,
        policyIds: endpointPolicyIds,
        globalArtifactRatio,
        throttler,
      }),

    hostIsolationExceptionsCount &&
      createHostIsolationExceptions({
        kbnClient,
        log,
        reportProgress: hostIsolationExceptionsReporter,
        count: hostIsolationExceptionsCount,
        policyIds: endpointPolicyIds,
        globalArtifactRatio,
        throttler,
      }),

    endpointExceptionsCount &&
      createEndpointExceptions({
        kbnClient,
        log,
        reportProgress: endpointExceptionsReporter,
        count: endpointExceptionsCount,
        policyIds: endpointPolicyIds,
        globalArtifactRatio,
        throttler,
      }),
  ]);

  await throttler.complete();
  reportProgress.stopReporting();
};
