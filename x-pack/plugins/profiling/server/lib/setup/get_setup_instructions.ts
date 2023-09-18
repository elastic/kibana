/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { fetchFindLatestPackageOrThrow } from '@kbn/fleet-plugin/server/services/epm/registry';
import { getCollectorPolicy, getSymbolizerPolicy } from './fleet_policies';

export interface SetupDataCollectionInstructions {
  collector: {
    secretToken?: string;
    host?: string;
  };
  symbolizer: {
    host?: string;
  };
  profilerAgent: {
    version: string;
  };

  stackVersion: string;
}

export async function getSetupInstructions({
  packagePolicyClient,
  soClient,
  apmServerHost,
  stackVersion,
}: {
  packagePolicyClient: PackagePolicyClient;
  soClient: SavedObjectsClientContract;
  apmServerHost?: string;
  stackVersion: string;
}): Promise<SetupDataCollectionInstructions> {
  const profilerAgent = await fetchFindLatestPackageOrThrow('profiler_agent', { prerelease: true });
  const collectorPolicy = await getCollectorPolicy({ packagePolicyClient, soClient });
  const symbolizerPolicy = await getSymbolizerPolicy({ packagePolicyClient, soClient });

  if (!collectorPolicy) {
    throw new Error('Could not find Collector policy');
  }

  if (!symbolizerPolicy) {
    throw new Error('Could not find Symbolizer policy');
  }

  const collectorVars = collectorPolicy.inputs[0].vars;
  const symbolizerHost = apmServerHost?.replace(/\.apm\./, '.symbols.');
  const collectorHost = apmServerHost?.replace(/\.apm\./, '.profiling.')?.replace('https://', '');

  return {
    collector: {
      secretToken: collectorVars?.secret_token?.value,
      host: collectorHost,
    },
    symbolizer: {
      host: symbolizerHost,
    },
    profilerAgent: {
      version: profilerAgent.version,
    },
    stackVersion,
  };
}
