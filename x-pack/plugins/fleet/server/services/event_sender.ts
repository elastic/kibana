/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { TelemetryEventsSender } from '../telemetry/sender';
import {
  FLEET_UPGRADES_CHANNEL_NAME,
  FLEET_INTEGRATIONS_POLICIES_EVENT_TYPE,
  MAX_ERROR_SIZE,
} from '../telemetry/constants';
import type { PackageUpdateEvent, IntegrationPoliciesEvent, EventError } from '../telemetry/types';

/*
 * Defines the telemetry event senders
 */

export function sendPackageUpdateTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  upgradeEvent: PackageUpdateEvent
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  try {
    const cappedErrors = capErrorSize(upgradeEvent.error || [], MAX_ERROR_SIZE);
    eventsTelemetry.queueTelemetryEvents(FLEET_UPGRADES_CHANNEL_NAME, [
      {
        ...upgradeEvent,
        error: upgradeEvent.error ? cappedErrors : undefined,
        errorMessage: upgradeEvent.errorMessage || makeErrorGeneric(cappedErrors),
      },
    ]);
  } catch (exc) {
    logger.error(`Queuing telemetry events failed ${exc}`);
  }
}

export function sendIntegrationPoliciesTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  integrationPoliciesEvent: IntegrationPoliciesEvent
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  try {
    const cappedErrors = capErrorSize(integrationPoliciesEvent?.error || [], MAX_ERROR_SIZE);
    eventsTelemetry.queueTelemetryEvents(FLEET_INTEGRATIONS_POLICIES_EVENT_TYPE, [
      {
        ...integrationPoliciesEvent,
        error: integrationPoliciesEvent.error ? cappedErrors : undefined,
        errorMessage: integrationPoliciesEvent.errorMessage || makeErrorGeneric(cappedErrors),
      },
    ]);
  } catch (exc) {
    logger.error(`Queuing telemetry events failed ${exc}`);
  }
}

export function capErrorSize(errors: EventError[], maxSize: number): EventError[] {
  return errors.length > maxSize ? errors?.slice(0, maxSize) : errors;
}

function makeErrorGeneric(errors: EventError[]): string[] {
  return errors.map((error) => {
    if (Array.isArray(error.message)) {
      const firstMessage = error.message[0];
      return firstMessage?.indexOf('is required') > -1 ? 'Field is required' : firstMessage;
    }
    return error.message as string;
  });
}
