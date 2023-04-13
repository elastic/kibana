/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { getApmPolicy } from './steps/get_apm_policy';

export interface SetupDataCollectionInstructions {
  variables: {
    apmServerUrl: string;
    secretToken: string;
  };
}

export async function getSetupInstructions({
  packagePolicyClient,
  soClient,
}: {
  packagePolicyClient: PackagePolicyClient;
  soClient: SavedObjectsClientContract;
}): Promise<SetupDataCollectionInstructions> {
  const apmPolicy = await getApmPolicy({ packagePolicyClient, soClient });

  if (!apmPolicy) {
    throw new Error('Could not find APM policy');
  }

  const apmServerVars = apmPolicy.inputs[0].vars;

  return {
    variables: {
      apmServerUrl: apmServerVars!.url.value!,
      secretToken: apmServerVars!.secret_token.value!,
    },
  };
}
