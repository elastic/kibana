/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from 'kibana/server';
import { UMRestApiRouteFactory } from '../types';
import { API_URLS } from '../../../common/constants';
import { httpDefaultFields } from '../../../common/constants/monitor_defaults';
import { SyntheticsMonitor, DataStream, ScheduleUnit } from '../../../common/runtime_types';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import { UptimeServerSetup } from '../../lib/adapters';

export const installIndexTemplatesRoute: UMRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.ELASTIC_AGENT_MONITORS,
  validate: {},
  handler: async ({ server, savedObjectsClient }): Promise<any> => {
    return addElasticAgentMonitors(server, savedObjectsClient);
  },
});

export async function addElasticAgentMonitors(
  server: UptimeServerSetup,
  savedObjectsClient: SavedObjectsClientContract
) {
  // no need to add error handling here since fleetSetupCompleted is already wrapped in try/catch and will log
  // warning if setup fails to complete
  await server.fleet.fleetSetupCompleted();

  const { agents } = await server.fleet.agentService.asInternalUser.listAgents({
    perPage: 20,
    showInactive: false,
  });

  for (let i = 0; i < agents.length; i++) {
    await savedObjectsClient.create<SyntheticsMonitor>(
      syntheticsMonitorType,
      {
        ...httpDefaultFields,
        name: `Elastic Agent ${agents[i].local_metadata.host.name}`,
        schedule: {
          unit: ScheduleUnit.MINUTES,
          number: '3',
        },
        type: DataStream.HTTP,
        urls: `${server.kibanaBaseUrl}/api/fleet/agents/${agents[i].id}`,
        locations: [
          {
            geo: { lat: 41.25, lon: -95.86 },
            id: 'us_central',
            isServiceManaged: true,
            label: 'US Central',
            url: 'https://us-central.synthetics.elastic.dev',
          },
        ],
        revision: 1,
      },
      {
        id: agents[i].id,
        overwrite: true,
      }
    );
  }
}
