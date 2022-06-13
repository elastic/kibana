/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sha256 } from 'js-sha256';
import type { Logger } from 'src/core/server';
import { SavedObjectsUpdateResponse, SavedObject } from 'kibana/server';
import {
  MonitorFields,
  EncryptedSyntheticsMonitor,
  ConfigKey,
  ServiceLocationErrors,
} from '../../../../common/runtime_types';
import type { MonitorUpdateEvent } from '../../../lib/telemetry/types';

import { TelemetryEventsSender } from '../../../lib/telemetry/sender';
import { MONITOR_UPDATE_CHANNEL, MONITOR_CURRENT_CHANNEL } from '../../../lib/telemetry/constants';

export interface UpgradeError {
  key?: string;
  message: string | string[];
}

export function sendTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  updateEvent: MonitorUpdateEvent
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  try {
    eventsTelemetry.queueTelemetryEvents(MONITOR_UPDATE_CHANNEL, [updateEvent]);
    eventsTelemetry.queueTelemetryEvents(MONITOR_CURRENT_CHANNEL, [updateEvent]);
  } catch (exc) {
    logger.error(`queing telemetry events failed ${exc}`);
  }
}

export function formatTelemetryEvent({
  monitor,
  kibanaVersion,
  lastUpdatedAt,
  durationSinceLastUpdated,
  deletedAt,
  errors,
}: {
  monitor: SavedObject<EncryptedSyntheticsMonitor>;
  kibanaVersion: string;
  lastUpdatedAt?: string;
  durationSinceLastUpdated?: number;
  deletedAt?: string;
  errors?: ServiceLocationErrors | null;
}) {
  const { attributes } = monitor;

  return {
    updatedAt: deletedAt || monitor.updated_at,
    lastUpdatedAt,
    durationSinceLastUpdated,
    deletedAt,
    type: attributes[ConfigKey.MONITOR_TYPE],
    locations: attributes[ConfigKey.LOCATIONS].map((location) =>
      location.isServiceManaged ? location.id : 'other'
    ), // mark self-managed locations as other
    locationsCount: attributes[ConfigKey.LOCATIONS].length,
    monitorNameLength: attributes[ConfigKey.NAME].length,
    monitorInterval: parseInt(attributes[ConfigKey.SCHEDULE].number, 10) * 60 * 1000,
    stackVersion: kibanaVersion,
    scriptType: getScriptType(attributes as Partial<MonitorFields>),
    errors:
      errors && errors?.length
        ? errors.map((e) => ({
            locationId: e.locationId,
            error: {
              // don't expose failed_monitors on error object
              status: e.error?.status,
              reason: e.error?.reason,
            },
          }))
        : undefined,
    configId: sha256.create().update(monitor.id).hex(),
    revision: attributes[ConfigKey.REVISION],
  };
}

export function formatTelemetryUpdateEvent(
  currentMonitor: SavedObjectsUpdateResponse<EncryptedSyntheticsMonitor>,
  previousMonitor: SavedObject<EncryptedSyntheticsMonitor>,
  kibanaVersion: string,
  errors?: ServiceLocationErrors | null
) {
  let durationSinceLastUpdated: number = 0;
  if (currentMonitor.updated_at && previousMonitor.updated_at) {
    durationSinceLastUpdated =
      new Date(currentMonitor.updated_at).getTime() -
      new Date(previousMonitor.updated_at).getTime();
  }

  return formatTelemetryEvent({
    monitor: currentMonitor as SavedObject<EncryptedSyntheticsMonitor>,
    kibanaVersion,
    durationSinceLastUpdated,
    lastUpdatedAt: previousMonitor.updated_at,
    errors,
  });
}

export function formatTelemetryDeleteEvent(
  previousMonitor: SavedObject<EncryptedSyntheticsMonitor>,
  kibanaVersion: string,
  deletedAt: string,
  errors?: ServiceLocationErrors | null
) {
  let durationSinceLastUpdated: number = 0;
  if (deletedAt && previousMonitor.updated_at) {
    durationSinceLastUpdated =
      new Date(deletedAt).getTime() - new Date(previousMonitor.updated_at).getTime();
  }

  return formatTelemetryEvent({
    monitor: previousMonitor as SavedObject<EncryptedSyntheticsMonitor>,
    kibanaVersion,
    durationSinceLastUpdated,
    lastUpdatedAt: previousMonitor.updated_at,
    deletedAt,
    errors,
  });
}

function getScriptType(
  attributes: Partial<MonitorFields>
): 'inline' | 'recorder' | 'zip' | undefined {
  if (attributes[ConfigKey.SOURCE_ZIP_URL]) {
    return 'zip';
  } else if (
    attributes[ConfigKey.SOURCE_INLINE] &&
    attributes[ConfigKey.METADATA]?.script_source?.is_generated_script
  ) {
    return 'recorder';
  } else if (attributes[ConfigKey.SOURCE_INLINE]) {
    return 'inline';
  }

  return undefined;
}
