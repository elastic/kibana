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

export const builtInKubernetesJobSemConvEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    id: `${BUILT_IN_ID_PREFIX}kubernetes_job_semconv`,
    filter: 'k8s.job.uid : *',
    managed: true,
    version: '0.1.0',
    name: 'Kubernetes Job from SemConv data',
    description:
      'This definition extracts Kubernetes job entities using data collected with OpenTelemetry',
    type: 'k8s.job.otel',
    indexPatterns: commonOtelIndexPatterns,
    identityFields: ['k8s.job.uid'],
    displayNameTemplate: '{{k8s.job.name}}',
    latest: {
      timestampField: '@timestamp',
      lookbackPeriod: '10m',
      settings: {
        frequency: '5m',
      },
    },
    metadata: [
      ...commonOtelMetadata,
      {
        source: 'k8s.job.name',
        destination: 'k8s.job.name',
        aggregation: { type: 'top_value', sort: { '@timestamp': 'desc' } },
      },
    ],
  });
