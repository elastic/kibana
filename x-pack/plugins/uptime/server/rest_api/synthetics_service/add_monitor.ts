/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObject } from 'kibana/server';
import { ConfigKey, MonitorFields, SyntheticsMonitor } from '../../../common/runtime_types';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';
import { validateMonitor } from './monitor_validation';
import { sendTelemetryEvents, formatTelemetryEvent } from './telemetry/monitor_upgrade_sender';
import { getAPIKeyForElasticAgentMonitoring } from '../../lib/synthetics_service/get_api_key';

import { SyntheticsServiceApiKey } from '../../../common/runtime_types/synthetics_service_api_key';

export const addSyntheticsMonitorRoute: UMRestApiRouteFactory = () => ({
  method: 'POST',
  path: API_URLS.SYNTHETICS_MONITORS,
  validate: {
    body: schema.any(),
  },
  handler: async ({ request, response, savedObjectsClient, server }): Promise<any> => {
    const monitor: SyntheticsMonitor = request.body.monitor as SyntheticsMonitor;
    const id: string = request.body.id;
    const isElasticAgentMonitor = monitor[ConfigKey.IS_ELASTIC_AGENT_MONITOR];
    let elasticAgentMonitoringApiKey: SyntheticsServiceApiKey | undefined;

    const validationResult = validateMonitor(monitor as MonitorFields);

    if (!validationResult.valid) {
      const { reason: message, details, payload } = validationResult;
      return response.badRequest({ body: { message, attributes: { details, ...payload } } });
    }

    if (monitor[ConfigKey.IS_ELASTIC_AGENT_MONITOR] === true) {
      elasticAgentMonitoringApiKey = await getAPIKeyForElasticAgentMonitoring({ request, server });
    }

    const newMonitor: SavedObject<SyntheticsMonitor> =
      await savedObjectsClient.create<SyntheticsMonitor>(
        syntheticsMonitorType,
        {
          ...monitor,
          revision: 1,
        },
        {
          id,
        }
      );

    const { syntheticsService } = server;

    const errors = await syntheticsService.pushConfigs(request, [
      {
        ...newMonitor.attributes,
        ...(isElasticAgentMonitor
          ? {
              [ConfigKey.REQUEST_HEADERS_CHECK]: {
                Authorization: `ApiKey ${Buffer.from(
                  `${elasticAgentMonitoringApiKey?.id}:${elasticAgentMonitoringApiKey?.apiKey}`,
                  'utf8'
                ).toString('base64')}`,
              },
            }
          : {}),
        id: newMonitor.id,
        fields: {
          config_id: newMonitor.id,
          is_elastic_agent_monitor: isElasticAgentMonitor ? true : false,
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
  },
});
