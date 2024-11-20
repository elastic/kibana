/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from '../../constants';
import { commonOtelIndexPatterns } from '../common/otel_index_patterns';
import { commonOtelMetadata } from '../common/otel_metadata';

export const builtInKubernetesCronJobSemConvEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    id: `${BUILT_IN_ID_PREFIX}kubernetes_cron_job_semconv`,
    filter: 'k8s.cronjob.uid : *',
    managed: true,
    version: '0.1.0',
    name: 'Kubernetes CronJob from SemConv data',
    description:
      'This definition extracts Kubernetes cron job entities using data collected with OpenTelemetry',
    type: 'k8s.cronjob.otel',
    indexPatterns: commonOtelIndexPatterns,
    identityFields: ['k8s.cronjob.uid'],
    displayNameTemplate: '{{k8s.cronjob.name}}',
    latest: {
      timestampField: '@timestamp',
      lookbackPeriod: '10m',
      settings: {
        frequency: '5m',
      },
    },
    metadata: commonOtelMetadata,
  });
