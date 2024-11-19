/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from '../../constants';
import { commonEcsMetadata } from '../common/ecs_metadata';
import { commonEcsIndexPatterns } from '../common/ecs_index_patterns';

export const builtInKubernetesStatefulSetEcsEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    id: `${BUILT_IN_ID_PREFIX}kubernetes_stateful_set_ecs`,
    filter: 'kubernetes.statefulset.uid : *',
    managed: true,
    version: '0.1.0',
    name: 'Kubernetes StatefulSet from ECS data',
    description:
      'This definition extracts Kubernetes stateful set entities from the Kubernetes integration data streams',
    type: 'k8s.statefulset.ecs',
    indexPatterns: commonEcsIndexPatterns,
    identityFields: ['kubernetes.statefulset.uid'],
    displayNameTemplate: '{{kubernetes.statefulset.name}}',
    latest: {
      timestampField: '@timestamp',
      lookbackPeriod: '10m',
      settings: {
        frequency: '5m',
      },
    },
    metadata: commonEcsMetadata,
  });
