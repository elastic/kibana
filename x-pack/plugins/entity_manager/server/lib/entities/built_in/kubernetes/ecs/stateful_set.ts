/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from '../../constants';

export const builtInKubernetesStatefulSetEcsEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    id: `${BUILT_IN_ID_PREFIX}kubernetes_stateful_set_ecs`,
    managed: true,
    version: '0.1.0',
    name: 'Kubernetes StatefulSet from ECS data',
    description:
      'This definition extracts Kubernetes stateful set entities from the Kubernetes integration data streams',
    type: 'kubernetes_stateful_set_ecs',
    indexPatterns: ['metrics-kubernetes*'],
    identityFields: ['kubernetes.statefulset.name'],
    displayNameTemplate: '{{kubernetes.statefulset.name}}',
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
      'kubernetes.namespace',
      'orchestrator.cluster.name',
    ],
  });
