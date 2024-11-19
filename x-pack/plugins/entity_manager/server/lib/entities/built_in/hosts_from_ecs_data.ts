/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from './constants';

export const builtInHostsFromEcsEntityDefinition: EntityDefinition = entityDefinitionSchema.parse({
  id: `${BUILT_IN_ID_PREFIX}hosts_from_ecs_data`,
  managed: true,
  version: '0.1.0',
  name: 'Hosts from ECS data',
  description:
    'This definition extracts host entities from common data streams by looking for the ECS field host.name',
  type: 'host',
  indexPatterns: ['filebeat-*', 'logs-*', 'metrics-*', 'metricbeat-*'],
  identityFields: ['host.name'],
  displayNameTemplate: '{{host.name}}',
  latest: {
    timestampField: '@timestamp',
    lookbackPeriod: '10m',
    settings: {
      frequency: '5m',
    },
  },
  metadata: [
    {
      source: '_index',
      destination: 'source_index',
    },
    {
      source: 'data_stream.type',
      destination: 'source_data_stream.type',
    },
    {
      source: 'data_stream.dataset',
      destination: 'source_data_stream.dataset',
    },
    'host.hostname',
    'host.ip',
    'host.mac',
    'host.architecture',
    'host.containerized',
    'host.os.platform',
    'host.os.name',
    'host.os.type',
    'host.os.codename',
    'host.os.family',
    'host.os.kernel',
    'host.os.version',
    'cloud.provider',
    'cloud.region',
    'cloud.availability_zone',
    'cloud.instance.id',
    'cloud.instance.name',
    'cloud.service.name',
    'cloud.machine.type',
    'cloud.account.id',
    'cloud.project.id',
    'agent.id',
    'agent.name',
    'agent.type',
    'agent.version',
  ],
});
