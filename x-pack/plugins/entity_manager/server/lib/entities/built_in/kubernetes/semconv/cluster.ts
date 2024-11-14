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

export const builtInKubernetesClusterSemConvEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    id: `${BUILT_IN_ID_PREFIX}kubernetes_cluster_semconv`,
    filter: 'k8s.cluster.uid: *',
    managed: true,
    version: '0.1.0',
    name: 'Kubernetes Clusters from SemConv data',
    description:
      'This definition extracts Kubernetes cluster entities using data collected with OpenTelemetry',
    type: 'kubernetes_cluster_semconv',
    indexPatterns: commonOtelIndexPatterns,
    identityFields: ['k8s.cluster.uid'],
    displayNameTemplate: '{{k8s.cluster.name}}',
    latest: {
      timestampField: '@timestamp',
      lookbackPeriod: '10m',
      settings: {
        frequency: '5m',
      },
    },
    metadata: commonOtelMetadata,
  });
