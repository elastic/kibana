/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClient } from 'kibana/server';

import { deleteUpgradeUsages } from '../services/upgrade_usage';

export interface PackagePolicyUpgradeUsage {
  package_name: string;
  current_version: string;
  new_version: string;
  status: 'success' | 'failure';
  error?: Array<{ key?: string; message: string }>;
}

export const getPackagePolicyUpgradeUsage = async (
  soClient?: SavedObjectsClient
): Promise<PackagePolicyUpgradeUsage[]> => {
  if (!soClient) {
    return [];
  }
  const telemetryObjects = await soClient.find<PackagePolicyUpgradeUsage>({
    type: 'package-policy-upgrade-telemetry',
  });

  const usages = telemetryObjects.saved_objects.map((so) => so.attributes);
  deleteUpgradeUsages(
    soClient,
    telemetryObjects.saved_objects.map((so) => so.id)
  );
  return usages;
};
