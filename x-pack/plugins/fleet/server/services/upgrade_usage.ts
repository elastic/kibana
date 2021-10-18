/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'kibana/server';
import type { Logger } from 'src/core/server';

import type { PackagePolicyUpgradeUsage } from '../collectors/package_upgrade_collectors';
import type { TelemetryEventsSender } from '../telemetry/sender';

export function createUpgradeUsage(
  soClient: SavedObjectsClientContract,
  upgradeUsage: PackagePolicyUpgradeUsage
) {
  soClient.create('package-policy-upgrade-telemetry', upgradeUsage, {
    id: `${upgradeUsage.package_name}_${upgradeUsage.current_version}_${upgradeUsage.new_version}_${upgradeUsage.status}`,
    overwrite: true,
  });
}

export function deleteUpgradeUsages(soClient: SavedObjectsClientContract, ids: string[]) {
  for (const id of ids) {
    soClient.delete('package-policy-upgrade-telemetry', id);
  }
}

export function sendAlertTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  upgradeUsage: PackagePolicyUpgradeUsage
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  try {
    eventsTelemetry.queueTelemetryEvents([
      {
        package_policy_upgrade: { ...upgradeUsage },
        id: `${upgradeUsage.package_name}_${upgradeUsage.current_version}_${upgradeUsage.new_version}_${upgradeUsage.status}`,
      },
    ]);
  } catch (exc) {
    logger.error(`queing telemetry events failed ${exc}`);
  }
}
