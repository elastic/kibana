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

export const builtInKubernetesDeploymentEcsEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    id: `${BUILT_IN_ID_PREFIX}kubernetes_deployment_ecs`,
    filter: 'kubernetes.deployment.uid : *',
    managed: true,
    version: '0.1.0',
    name: 'Kubernetes Deployment from ECS data',
    description:
      'This definition extracts Kubernetes deployment entities from the Kubernetes integration data streams',
    type: 'k8s.deployment.ecs',
    indexPatterns: commonEcsIndexPatterns,
    identityFields: ['kubernetes.deployment.uid'],
    displayNameTemplate: '{{kubernetes.deployment.name}}',
    latest: {
      timestampField: '@timestamp',
      lookbackPeriod: '10m',
      settings: {
        frequency: '5m',
      },
    },
    metadata: commonEcsMetadata,
  });
