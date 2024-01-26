/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';

export const ELASTIC_CLOUD_APM_POLICY = 'elastic-cloud-apm';

export async function getApmPolicy({
  packagePolicyClient,
  soClient,
}: {
  packagePolicyClient: PackagePolicyClient;
  soClient: SavedObjectsClientContract;
}) {
  return packagePolicyClient.get(soClient, ELASTIC_CLOUD_APM_POLICY);
}
