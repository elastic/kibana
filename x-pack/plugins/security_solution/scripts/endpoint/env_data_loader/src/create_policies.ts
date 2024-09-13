/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { loop } from './utils';
import type { ExecutionThrottler } from '../../common/execution_throttler';
import {
  addEndpointIntegrationToAgentPolicy,
  copyAgentPolicy,
  createAgentPolicy,
} from '../../common/fleet_services';
import type { ReportProgressCallback } from './types';

interface CreatePoliciesOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  count: number;
  reportProgress: ReportProgressCallback;
  throttler: ExecutionThrottler;
}

export const createPolicies = async ({
  kbnClient,
  count,
  reportProgress,
  log,
  throttler,
}: CreatePoliciesOptions): Promise<string[]> => {
  const endpointIntegrationPolicyIds: string[] = [];
  const errors: Error[] = [];
  let doneCount = 0;

  log.verbose(`creating [${count}] policies in fleet`);

  // Create first policy with endpoint
  const agentPolicyId = (await createAgentPolicy({ kbnClient })).id;
  const endpointPolicy = await addEndpointIntegrationToAgentPolicy({
    kbnClient,
    log,
    agentPolicyId,
    name: `endpoint protect policy (${Math.random().toString(32).substring(2)})`,
  });

  endpointIntegrationPolicyIds.push(endpointPolicy.id);
  doneCount++;
  reportProgress({ doneCount, errorCount: errors.length });

  // TODO:PT maybe use ES bulk create and bypass fleet so that we speed this up?

  loop(count - 1, () => {
    throttler.addToQueue(async () => {
      await copyAgentPolicy({ kbnClient, agentPolicyId })
        .then((response) => {
          if (response.package_policies?.[0]) {
            endpointIntegrationPolicyIds.push(response.package_policies[0].id);
          } else {
            errors.push(
              new Error(
                `Copy of agent policy [${agentPolicyId}] did not copy the Endpoint Integration!`
              )
            );
          }
        })
        .catch((e) => {
          errors.push(e);
        })
        .finally(() => {
          doneCount++;
          reportProgress({ doneCount, errorCount: errors.length });
        });
    });
  });

  await throttler.complete();

  if (errors.length) {
    log.error(
      `${errors.length} errors encountered while trying to create policies. First error: ${errors[0].message}`
    );
    log.verbose(...errors);
  }

  return endpointIntegrationPolicyIds;
};
