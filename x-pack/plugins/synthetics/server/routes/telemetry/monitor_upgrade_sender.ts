/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sha256 } from 'js-sha256';
import type { Logger } from '@kbn/core/server';
import { SavedObjectsUpdateResponse, SavedObject } from '@kbn/core/server';
import { scheduleToMilli } from '../../../common/lib/schedule_to_time';
import {
  MonitorFields,
  EncryptedSyntheticsMonitor,
  ConfigKey,
  ServiceLocationErrors,
  SourceType,
} from '../../../common/runtime_types';
import type { MonitorUpdateEvent } from '../../legacy_uptime/lib/telemetry/types';

import { TelemetryEventsSender } from '../../legacy_uptime/lib/telemetry/sender';
import {
  MONITOR_UPDATE_CHANNEL,
  MONITOR_CURRENT_CHANNEL,
  MONITOR_ERROR_EVENTS_CHANNEL,
} from '../../legacy_uptime/lib/telemetry/constants';
import { MonitorErrorEvent } from '../../legacy_uptime/lib/telemetry/types';

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
    logger.error(`queuing telemetry events failed ${exc}`);
  }
}

export function sendErrorTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  updateEvent: MonitorErrorEvent
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  try {
    eventsTelemetry.queueTelemetryEvents(MONITOR_ERROR_EVENTS_CHANNEL, [updateEvent]);
  } catch (exc) {
    logger.error(`queuing telemetry events failed ${exc}`);
  }
}

export function formatTelemetryEvent({
  monitor,
  stackVersion,
  isInlineScript,
  lastUpdatedAt,
  durationSinceLastUpdated,
  deletedAt,
  errors,
}: {
  monitor: SavedObject<EncryptedSyntheticsMonitor>;
  stackVersion: string;
  isInlineScript: boolean;
  lastUpdatedAt?: string;
  durationSinceLastUpdated?: number;
  deletedAt?: string;
  errors?: ServiceLocationErrors | null;
}) {
  const { attributes } = monitor;

  return {
    stackVersion,
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
    monitorInterval: scheduleToMilli(attributes[ConfigKey.SCHEDULE]),
    scriptType: getScriptType(attributes as Partial<MonitorFields>, isInlineScript),
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
  stackVersion: string,
  isInlineScript: boolean,
  errors?: ServiceLocationErrors | null
) {
  let durationSinceLastUpdated: number = 0;
  if (currentMonitor.updated_at && previousMonitor.updated_at) {
    durationSinceLastUpdated =
      new Date(currentMonitor.updated_at).getTime() -
      new Date(previousMonitor.updated_at).getTime();
  }

  return formatTelemetryEvent({
    stackVersion,
    monitor: currentMonitor as SavedObject<EncryptedSyntheticsMonitor>,
    durationSinceLastUpdated,
    lastUpdatedAt: previousMonitor.updated_at,
    isInlineScript,
    errors,
  });
}

export function formatTelemetryDeleteEvent(
  previousMonitor: SavedObject<EncryptedSyntheticsMonitor>,
  stackVersion: string,
  deletedAt: string,
  isInlineScript: boolean,
  errors?: ServiceLocationErrors | null
) {
  let durationSinceLastUpdated: number = 0;
  if (deletedAt && previousMonitor.updated_at) {
    durationSinceLastUpdated =
      new Date(deletedAt).getTime() - new Date(previousMonitor.updated_at).getTime();
  }

  return formatTelemetryEvent({
    stackVersion,
    monitor: previousMonitor as SavedObject<EncryptedSyntheticsMonitor>,
    durationSinceLastUpdated,
    lastUpdatedAt: previousMonitor.updated_at,
    deletedAt,
    isInlineScript,
    errors,
  });
}

function getScriptType(
  attributes: Partial<MonitorFields>,
  isInlineScript: boolean
): MonitorUpdateEvent['scriptType'] | undefined {
  switch (true) {
    case Boolean(attributes[ConfigKey.SOURCE_ZIP_URL]):
      return 'zip';
    case Boolean(
      isInlineScript && attributes[ConfigKey.METADATA]?.script_source?.is_generated_script
    ):
      return 'recorder';
    case Boolean(isInlineScript):
      return 'inline';
    case attributes[ConfigKey.MONITOR_SOURCE_TYPE] === SourceType.PROJECT:
      return 'project';
    default:
      return undefined;
  }
}
