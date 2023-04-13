/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { Logger } from '@kbn/logging';
import { ProfilingESClient } from '../../utils/create_profiling_es_client';

export interface ProfilingSetupStep {
  name: string;
  init: () => Promise<void>;
  hasCompleted: () => Promise<boolean>;
}

export interface ProfilingSetupStepFactoryOptions {
  client: ProfilingESClient;
  soClient: SavedObjectsClientContract;
  packagePolicyClient: PackagePolicyClient;
  logger: Logger;
  spaceId: string;
  isCloudEnabled: boolean;
}
