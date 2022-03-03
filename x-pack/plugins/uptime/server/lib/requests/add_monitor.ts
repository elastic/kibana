/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObject,
  SavedObjectsClientContract,
  KibanaRequest,
  KibanaResponseFactory,
} from 'kibana/server';
import { ConfigKey, SyntheticsMonitor, MonitorFields } from '../../../common/runtime_types';
import { defaultConfig } from '../../../common/constants/monitor_defaults';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';
import { validateMonitor } from '../../rest_api/synthetics_service/monitor_validation';
import {
  sendTelemetryEvents,
  formatTelemetryEvent,
} from '../../rest_api/synthetics_service/telemetry/monitor_upgrade_sender';

export const addSyntheticMonitor = async ({
  request,
  response,
  savedObjectsClient,
  server,
}: {
  request: KibanaRequest;
  response: KibanaResponseFactory;
  savedObjectsClient: SavedObjectsClientContract;
  server: any;
}): Promise<any> => {
  const monitor: SyntheticsMonitor = request.body as SyntheticsMonitor;
  const validationResult = validateMonitor(request.body as MonitorFields);

  if (!validationResult.valid) {
    const { reason: message, details, payload } = validationResult;
    return response.badRequest({ body: { message, attributes: { details, ...payload } } });
  }

  const newMonitor: SavedObject<SyntheticsMonitor> =
    await savedObjectsClient.create<SyntheticsMonitor>(syntheticsMonitorType, {
      ...defaultConfig[monitor[ConfigKey.MONITOR_TYPE]],
      ...monitor,
      revision: 1,
    });

  const errors = await server.syntheticsService.pushConfigs(request, [
    {
      ...newMonitor.attributes,
      id: newMonitor.id,
      fields: {
        config_id: newMonitor.id,
      },
      fields_under_root: true,
    },
  ]);

  sendTelemetryEvents(
    server.logger,
    server.telemetry,
    formatTelemetryEvent({ monitor: newMonitor, errors, kibanaVersion: server.kibanaVersion })
  );

  if (errors) {
    return errors;
  }

  return newMonitor;
};
