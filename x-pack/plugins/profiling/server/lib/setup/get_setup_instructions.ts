/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { getCollectorPolicy, getSymbolizerPolicy } from './fleet_policies';

export interface SetupDataCollectionInstructions {
  variables: {
    collector: {
      secretToken: string;
      host: string;
    };
    symbolizer: {
      host: string;
    };
  };
}

export async function getSetupInstructions({
  packagePolicyClient,
  soClient,
}: {
  packagePolicyClient: PackagePolicyClient;
  soClient: SavedObjectsClientContract;
}): Promise<SetupDataCollectionInstructions> {
  const [collectorPolicy, symbolizerPolicy] = await Promise.all([
    getCollectorPolicy({ packagePolicyClient, soClient }),
    getSymbolizerPolicy({ packagePolicyClient, soClient }),
  ]);

  if (!collectorPolicy) {
    throw new Error('Could not find Collector policy');
  }

  if (!symbolizerPolicy) {
    throw new Error('Could not find Symbolizer policy');
  }

  const collectorVars = collectorPolicy.inputs[0].vars;
  const symbolizerVars = symbolizerPolicy.inputs[0].vars;

  return {
    variables: {
      collector: {
        secretToken: collectorVars!.secret_token.value!,
        host: collectorVars!.host.value,
      },
      symbolizer: {
        host: symbolizerVars!.host.value,
      },
    },
  };
}
