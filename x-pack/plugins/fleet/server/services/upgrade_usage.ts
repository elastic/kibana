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
  error?: UpgradeError[];
  dryRun?: boolean;
  error_message?: string[];
}

export interface UpgradeError {
  key?: string;
  message: string | string[];
}

export const MAX_ERROR_SIZE = 100;
export const FLEET_UPGRADES_CHANNEL_NAME = 'fleet-upgrades';

export function sendTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  upgradeUsage: PackagePolicyUpgradeUsage
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  try {
    const cappedErrors = capErrorSize(upgradeUsage.error || [], MAX_ERROR_SIZE);
    eventsTelemetry.queueTelemetryEvents(FLEET_UPGRADES_CHANNEL_NAME, [
      {
        ...upgradeUsage,
        error: upgradeUsage.error ? cappedErrors : undefined,
        error_message: makeErrorGeneric(cappedErrors),
      },
    ]);
  } catch (exc) {
    logger.error(`queing telemetry events failed ${exc}`);
  }
}

export function capErrorSize(errors: UpgradeError[], maxSize: number): UpgradeError[] {
  return errors.length > maxSize ? errors?.slice(0, maxSize) : errors;
}

function makeErrorGeneric(errors: UpgradeError[]): string[] {
  return errors.map((error) => {
    if (Array.isArray(error.message)) {
      const firstMessage = error.message[0];
      return firstMessage?.indexOf('is required') > -1 ? 'Field is required' : firstMessage;
    }
    return error.message as string;
  });
}
