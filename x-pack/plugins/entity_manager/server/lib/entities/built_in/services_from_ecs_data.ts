/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from './constants';

export const builtInServicesFromEcsEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    version: '0.5.0',
    id: `${BUILT_IN_ID_PREFIX}services_from_ecs_data`,
    name: 'Services from ECS data',
    description:
      'This definition extracts service entities from common data streams by looking for the ECS field service.name',
    type: 'service',
    managed: true,
    indexPatterns: ['logs-*', 'filebeat*', 'traces-*'],
    latest: {
      timestampField: '@timestamp',
      lookbackPeriod: '10m',
      settings: {
        frequency: '2m',
        syncDelay: '2m',
      },
    },
    identityFields: ['service.name'],
    displayNameTemplate: '{{service.name}}',
    metadata: [
      { source: '_index', destination: 'source_index' },
      {
        source: 'data_stream.type',
        destination: 'source_data_stream.type',
      },
      {
        source: 'data_stream.dataset',
        destination: 'source_data_stream.dataset',
      },
      'agent.name',
      'service.environment',
      'service.name',
      'service.namespace',
      'service.version',
      'service.runtime.name',
      'service.runtime.version',
      'service.language.name',
      'cloud.provider',
      'cloud.availability_zone',
      'cloud.machine.type',
      'kubernetes.namespace',
      'orchestrator.cluster.name',
      'k8s.namespace.name',
      'k8s.cluster.name',
    ],
  });
