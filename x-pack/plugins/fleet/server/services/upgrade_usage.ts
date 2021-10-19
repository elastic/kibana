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
}

export interface UpgradeError {
  key?: string;
  message: string | string[];
}

export const MAX_ERROR_SIZE = 100;

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
          error: upgradeUsage.error
            ? makeErrorGeneric(capErrorSize(upgradeUsage.error, MAX_ERROR_SIZE))
            : undefined,
        },
        id: `${upgradeUsage.package_name}_${upgradeUsage.current_version}_${upgradeUsage.new_version}_${upgradeUsage.status}`,
      },
    ]);
  } catch (exc) {
    logger.error(`queing telemetry events failed ${exc}`);
  }
}

export function capErrorSize(errors: UpgradeError[], maxSize: number): UpgradeError[] {
  return errors.length > maxSize ? errors?.slice(0, maxSize) : errors;
}

function makeErrorGeneric(errors: UpgradeError[]): UpgradeError[] {
  return errors.map((error) => {
    let message = error.message;
    if (error.key && Array.isArray(error.message) && error.message[0].indexOf('is required') > -1) {
      message = ['Field is required'];
    }
    return {
      key: error.key,
      message,
    };
  });
}
