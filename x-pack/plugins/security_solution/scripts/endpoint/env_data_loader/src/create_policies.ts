/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
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
}

export const createPolicies = async ({
  kbnClient,
  count,
  reportProgress,
  log,
}: CreatePoliciesOptions): Promise<string[]> => {
  const endpointIntegrationPolicyIds: string[] = [];
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
  reportProgress({ doneCount });

  while (doneCount < count) {
    // TODO:PT maybe use ES bulk create and bypass fleet so that we speed this up?
    endpointIntegrationPolicyIds.push((await copyAgentPolicy({ kbnClient, agentPolicyId })).id);
    doneCount++;
    reportProgress({ doneCount });
  }

  return endpointIntegrationPolicyIds;
};
