/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { agentConfigService } from './agent_config';

export async function setup(soClient: SavedObjectsClientContract) {
  // TODO install default packages
  await agentConfigService.ensureDefaultAgentConfig(soClient);
}
