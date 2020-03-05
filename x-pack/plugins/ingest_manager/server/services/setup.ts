/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { CallESAsCurrentUser } from '../types';
import { agentConfigService } from './agent_config';
import { outputService } from './output';
import { ensureInstalledDefaultPackages } from './epm/packages/install';

export async function setup(
  soClient: SavedObjectsClientContract,
  callCluster: CallESAsCurrentUser
) {
  await Promise.all([
    outputService.ensureDefaultOutput(soClient),
    agentConfigService.ensureDefaultAgentConfig(soClient),

    // packages installed by default
    ensureInstalledDefaultPackages(soClient, callCluster),
  ]);
}
