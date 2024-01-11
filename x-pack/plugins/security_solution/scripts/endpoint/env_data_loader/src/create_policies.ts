/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ProgressReporter } from './types';

interface CreatePoliciesOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  count: number;
  reportProgress: ProgressReporter;
}

export const createPolicies = async ({
  kbnClient,
  count,
  reportProgress,
  log,
}: CreatePoliciesOptions): Promise<string[]> => {
  const endpointIntegrationPolicyIds: string[] = [];

  log.verbose(`creating [${count}] policies in fleet`);

  // Create first policy with endpoint

  // THEN: use the copy API to clone it?
  //        -- or --
  //       Maybe use ES bulk create and bypass fleet? (for speed)

  return endpointIntegrationPolicyIds;
};
