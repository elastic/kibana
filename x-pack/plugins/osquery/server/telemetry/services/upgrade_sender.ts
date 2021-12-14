/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'src/core/server';

import type { TelemetryEventsSender } from '../sender';
import { ecsMappingOrUndefined } from '../../../common/schemas';

export interface SavedQueryEvent {
  tables: {
    [key: string]: {
      all: boolean;
      columns: string[];
    };
  };
  ecs_mapping: ecsMappingOrUndefined;
  interval: string;
  platform: string;
  status: 'success' | 'failure';
  errorMessage?: string[] | string;
  error?: UpgradeError[];
  eventType: SavedQueryEventType;
}

export enum SavedQueryEventType {
  SAVED_QUERY_CREATE = 'saved-query-create',
  SAVED_QUERY_UPDATE = 'saved-query-update',
}

export interface UpgradeError {
  key?: string;
  message: string | string[];
}

export const MAX_ERROR_SIZE = 100;
export const OSQUERY_UPGRADES_CHANNEL_NAME = 'osquery-upgrades';

export function sendTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  upgradeEvent: SavedQueryEvent
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  try {
    const cappedErrors = capErrorSize(upgradeEvent.error || [], MAX_ERROR_SIZE);
    eventsTelemetry.queueTelemetryEvents(OSQUERY_UPGRADES_CHANNEL_NAME, [
      {
        ...upgradeEvent,
        error: upgradeEvent.error ? cappedErrors : undefined,
        errorMessage: upgradeEvent.errorMessage || makeErrorGeneric(cappedErrors),
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
