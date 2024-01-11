/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { installOrUpgradeEndpointFleetPackage } from '../../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { ProgressReporter } from './progress_reporter';
import type { ProgressReporterInterface } from './types';
import { createPolicies } from './create_policies';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';

interface LoadOptions {
  kbnClient: KbnClient;
  log?: ToolingLog;
  policyCount: number;
}

export const load = async ({
  kbnClient,
  log = createToolingLogger(),
  policyCount,
}: LoadOptions) => {
  const reportProgress: ProgressReporterInterface = new ProgressReporter({
    reportStatus: (status) => {
      log.info(status);
    },
  });

  reportProgress.addCategory('policies', policyCount);

  // DO ==> Log state to a file in case of failure?

  // DO ==> Turn off task `endpoint:user-artifact-packager`

  await installOrUpgradeEndpointFleetPackage(kbnClient, log);

  const endpointPolicyIds = await createPolicies({
    kbnClient,
    log,
    count: policyCount,
    reportProgress: reportProgress.getReporter('policies'),
  });

  // DO => create all artifacts
  //

  // DO => re-enable the task
  //

  reportProgress.stopReporting();
};
