/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from '../../constants';
import { commonEcsIndexPatterns } from '../common/ecs_index_patterns';
import { commonEcsMetadata } from '../common/ecs_metadata';

export const builtInKubernetesCronJobEcsEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    id: `${BUILT_IN_ID_PREFIX}kubernetes_cron_job_ecs`,
    filter: 'kubernetes.cronjob.uid : *',
    managed: true,
    version: '0.1.0',
    name: 'Kubernetes CronJob from ECS data',
    description:
      'This definition extracts Kubernetes cron job entities from the Kubernetes integration data streams',
    type: 'k8s.cronjob.ecs',
    indexPatterns: commonEcsIndexPatterns,
    identityFields: ['kubernetes.cronjob.uid'],
    displayNameTemplate: '{{kubernetes.cronjob.name}}',
    latest: {
      timestampField: '@timestamp',
      lookbackPeriod: '10m',
      settings: {
        frequency: '5m',
      },
    },
    metadata: commonEcsMetadata,
  });
