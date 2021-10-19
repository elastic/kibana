/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'src/core/server';

import type { TelemetryEventsSender } from '../telemetry/sender';

export interface PackagePolicyUpgradeUsage {
  package_name: string;
  current_version: string;
  new_version: string;
  status: 'success' | 'failure';
  error?: Array<{ key?: string; message: string }>;
}

export function sendTelemetryEvents(
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
        package_policy_upgrade: {
          ...upgradeUsage,
          error: capErrorSize(upgradeUsage.error),
        },
        id: `${upgradeUsage.package_name}_${upgradeUsage.current_version}_${upgradeUsage.new_version}_${upgradeUsage.status}`,
      },
    ]);
  } catch (exc) {
    logger.error(`queing telemetry events failed ${exc}`);
  }
}

function capErrorSize(errors?: any[]) {
  const MAX_ERROR_SIZE = 100;
  return (errors || []).length > MAX_ERROR_SIZE ? errors?.slice(0, MAX_ERROR_SIZE) : errors;
}
