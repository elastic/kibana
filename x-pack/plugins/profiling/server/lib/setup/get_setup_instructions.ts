/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { getCollectorPolicy } from './fleet_policies';
import { getApmPolicy } from './get_apm_policy';

export interface SetupDataCollectionInstructions {
  collector: {
    secretToken?: string;
    host?: string;
  };
  symbolizer: {
    host?: string;
  };
}

export async function getSetupInstructions({
  packagePolicyClient,
  soClient,
}: {
  packagePolicyClient: PackagePolicyClient;
  soClient: SavedObjectsClientContract;
}): Promise<SetupDataCollectionInstructions> {
  const [collectorPolicy, apmPolicy] = await Promise.all([
    getCollectorPolicy({ packagePolicyClient, soClient }),
    getApmPolicy({ packagePolicyClient, soClient }),
  ]);

  if (!collectorPolicy) {
    throw new Error('Could not find Collector policy');
  }

  if (!apmPolicy) {
    throw new Error('Could not find APM policy');
  }

  const collectorVars = collectorPolicy.inputs[0].vars;
  const apmServerVars = apmPolicy.inputs[0].vars;

  const apmHost: string | undefined = apmServerVars?.host?.value;
  const symbolizerHost = apmHost?.replace(/\.apm\./, '.symbols.');
  const collectorHost = apmHost?.replace(/\.apm\./, '.profiling.')?.replace('https://', '');

  return {
    collector: {
      secretToken: collectorVars?.secret_token?.value,
      host: collectorHost,
    },
    symbolizer: {
      host: symbolizerHost,
    },
  };
}
